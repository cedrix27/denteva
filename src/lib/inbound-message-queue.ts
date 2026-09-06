import { ConversationIntakeState, ConversationStatus, InboundMessageJobStatus, IntegrationProvider, MessageAuthor } from "@prisma/client";
import { generateConversationReply, isConversationThrottled, type CabinetContext } from "@/lib/ai/conversation-reply";
import { logger } from "@/lib/logger";
import { isUrgentDentalMessage, notifyUrgentConversation } from "@/lib/cabinet-notifications";
import { prisma } from "@/lib/prisma";
import { sendTwilioLanguageSelection, sendTwilioWhatsAppText } from "@/lib/twilio-whatsapp";

const MAX_ATTEMPTS = 5;
const STALE_LOCK_MS = 5 * 60_000;

export async function enqueueInboundMessage(input: { externalId: string; cabinetId: string; conversationId: string; messageId: string }) { return prisma.inboundMessageJob.create({ data: input }); }
async function claimNextJob() { const now = new Date(); const staleAt = new Date(now.getTime() - STALE_LOCK_MS); const candidate = await prisma.inboundMessageJob.findFirst({ where: { OR: [{ status: InboundMessageJobStatus.PENDING, availableAt: { lte: now } }, { status: InboundMessageJobStatus.PROCESSING, lockedAt: { lt: staleAt } }] }, orderBy: { createdAt: "asc" } }); if (!candidate) return null; const claimed = await prisma.inboundMessageJob.updateMany({ where: { id: candidate.id, status: candidate.status, updatedAt: candidate.updatedAt }, data: { status: InboundMessageJobStatus.PROCESSING, lockedAt: now, attempts: { increment: 1 }, lastError: null } }); return claimed.count ? prisma.inboundMessageJob.findUnique({ where: { id: candidate.id } }) : null; }
async function deliver(conversationId: string, to: string, body: string, sender: string | null, context: Record<string, unknown>) { const sent = await sendTwilioWhatsAppText(to, body, sender); if (!sent.delivered) throw new Error(`TWILIO_DELIVERY_${sent.reason}`); await prisma.message.create({ data: { conversationId, author: MessageAuthor.ASSISTANT, body, externalId: sent.externalId ?? undefined } }); logger.info("whatsapp.reply_delivered", context); }
function selectedLanguage(value: string) { const normalized = value.trim().toLowerCase(); if (["1", "fr", "francais", "français"].includes(normalized)) return "fr"; if (["2", "en", "english", "anglais"].includes(normalized)) return "en"; if (["3", "darija", "ar", "arabic", "arabe"].includes(normalized)) return "darija"; return null; }
function normalizeLanguages(values: string[]) { const result: string[] = []; for (const value of values) { const normalized = value.trim().toLowerCase(); const code = ["fr", "francais", "français", "french"].includes(normalized) ? "fr" : ["en", "english", "anglais"].includes(normalized) ? "en" : ["darija", "ar", "arabic", "arabe"].includes(normalized) ? "darija" : null; if (code && !result.includes(code)) result.push(code); } return result; }
function assistantFallback(language: string) { if (language === "en") return "I’m temporarily having trouble accessing the clinic’s calendar. Please try again in a moment, or contact the clinic directly so the team can arrange your appointment."; if (language === "darija") return "كاين مشكل مؤقت فالوصول للأجندة ديال العيادة. عاود صيفط لينا الرسالة من بعد شوية، أو تاصل مباشرة بالعيادة باش نعاونك فالموعد."; return "Je rencontre momentanément une difficulté pour accéder à l’agenda du cabinet. Réessayez dans un instant ou contactez directement l’équipe afin qu’elle organise votre rendez-vous."; }
async function processJob(job: { id: string; messageId: string }) { const inbound = await prisma.message.findUnique({ where: { id: job.messageId }, include: { conversation: { include: { patient: true, cabinet: true } } } }); if (!inbound || inbound.author !== MessageAuthor.PATIENT) return; const conversation = inbound.conversation; const cabinet = conversation.cabinet; const patient = conversation.patient; const integration = await prisma.integrationAccount.findUnique({ where: { cabinetId_provider: { cabinetId: cabinet.id, provider: IntegrationProvider.TWILIO_WHATSAPP } }, select: { externalPhoneNumberId: true } }); if (!integration?.externalPhoneNumberId) { logger.warn("inbound_queue.sender_not_connected", { cabinetId: cabinet.id, jobId: job.id }); return; } const alreadyAnswered = await prisma.message.findFirst({ where: { conversationId: conversation.id, author: MessageAuthor.ASSISTANT, createdAt: { gte: inbound.createdAt } }, select: { id: true } }); if (alreadyAnswered) return; const context = { cabinetId: cabinet.id, conversationId: conversation.id, jobId: job.id };
  if (isUrgentDentalMessage(inbound.body)) { await prisma.conversation.update({ where: { id: conversation.id }, data: { urgent: true, status: ConversationStatus.WAITING_HUMAN } }); await notifyUrgentConversation(cabinet.id, conversation.id); return; }
  if (conversation.intakeState === ConversationIntakeState.LANGUAGE_SELECTION) { const language = selectedLanguage(inbound.body); const supportedLanguages = normalizeLanguages(cabinet.supportedLanguages); if (!language || !supportedLanguages.includes(language)) { const sent = await sendTwilioLanguageSelection(patient.phone, supportedLanguages, integration.externalPhoneNumberId); if (!sent.delivered) throw new Error(`TWILIO_DELIVERY_${sent.reason}`); return; } await Promise.all([prisma.patient.update({ where: { id: patient.id }, data: { preferredLang: language } }), prisma.conversation.update({ where: { id: conversation.id }, data: { intakeState: ConversationIntakeState.OPEN } })]); const welcome = language === "en" ? "Thank you. How can we help you today?" : language === "darija" ? "شكراً. كيف نقدروا نعاونك اليوم؟" : "Merci. Comment pouvons-nous vous aider aujourd’hui ?"; await deliver(conversation.id, patient.phone, welcome, integration.externalPhoneNumberId, context); return; }
  if (conversation.status === ConversationStatus.WAITING_HUMAN) return;
  if (await isConversationThrottled(conversation.id)) { await prisma.conversation.update({ where: { id: conversation.id }, data: { status: ConversationStatus.WAITING_HUMAN } }); return; }
  const reply = await generateConversationReply({ cabinet: cabinet as CabinetContext, conversationId: conversation.id, inboundMessageId: inbound.id, language: patient.preferredLang, message: inbound.body, patientId: patient.id });
  if (reply.ok) { await deliver(conversation.id, patient.phone, reply.text, integration.externalPhoneNumberId, context); return; }
  // A provider blip must not burn the patient's message: throwing hands the job back
  // to the queue, which retries with backoff and only falls back once attempts run out.
  if (reply.retryable) throw new Error(`ASSISTANT_${reply.reason}`);
  // Not retryable: the model produced nothing usable. Answer once, and hand over to
  // the team rather than leaving the patient on an assistant that cannot reply.
  await handOverToTeam(conversation.id, patient.phone, patient.preferredLang, integration.externalPhoneNumberId, { ...context, reason: reply.reason });
}

/** Last-resort answer plus human handover, so no inbound message ends in silence. */
async function handOverToTeam(conversationId: string, phone: string, language: string, sender: string | null, context: Record<string, unknown>) {
  await prisma.conversation.update({ where: { id: conversationId }, data: { status: ConversationStatus.WAITING_HUMAN } });
  await deliver(conversationId, phone, assistantFallback(language), sender, { ...context, fallback: true });
  logger.warn("inbound_queue.handed_over_to_team", context);
}
async function markFailure(job: { id: string; attempts: number; conversationId: string }, error: unknown) { const message = error instanceof Error ? error.message.slice(0, 500) : "UNKNOWN_ERROR"; const terminal = job.attempts >= MAX_ATTEMPTS; const delayMinutes = Math.min(30, 2 ** Math.max(0, job.attempts - 1)); await prisma.inboundMessageJob.update({ where: { id: job.id }, data: terminal ? { status: InboundMessageJobStatus.FAILED, lockedAt: null, lastError: message } : { status: InboundMessageJobStatus.PENDING, lockedAt: null, availableAt: new Date(Date.now() + delayMinutes * 60_000), lastError: message } }); logger.error("inbound_queue.job_failed", { jobId: job.id, attempts: job.attempts, terminal, error });
  // Out of retries: the patient has been waiting since the first attempt and must
  // still get an answer, plus a human to take over.
  if (terminal) await deliverTerminalFallback(job.conversationId).catch((cause) => logger.error("inbound_queue.terminal_fallback_failed", { jobId: job.id, error: cause }));
}

async function deliverTerminalFallback(conversationId: string) {
  const conversation = await prisma.conversation.findUnique({ where: { id: conversationId }, include: { patient: true } });
  if (!conversation) return;
  const integration = await prisma.integrationAccount.findUnique({ where: { cabinetId_provider: { cabinetId: conversation.cabinetId, provider: IntegrationProvider.TWILIO_WHATSAPP } }, select: { externalPhoneNumberId: true } });
  if (!integration?.externalPhoneNumberId) return;
  await handOverToTeam(conversation.id, conversation.patient.phone, conversation.patient.preferredLang, integration.externalPhoneNumberId, { conversationId, terminal: true });
}
export async function processInboundMessageJobs(limit = 10) { let processed = 0; let completed = 0; let failed = 0; for (let index = 0; index < limit; index += 1) { const job = await claimNextJob(); if (!job) break; processed += 1; try { await processJob(job); await prisma.inboundMessageJob.update({ where: { id: job.id }, data: { status: InboundMessageJobStatus.COMPLETED, lockedAt: null, completedAt: new Date(), lastError: null } }); completed += 1; } catch (error) { await markFailure(job, error); failed += 1; } } return { processed, completed, failed }; }
