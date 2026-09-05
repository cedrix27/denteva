import { createHmac, timingSafeEqual } from "node:crypto";
import { ConversationStatus, IntegrationProvider, MessageAuthor } from "@prisma/client";
import { processInboundMessageJobs } from "@/lib/inbound-message-queue";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { normalizeWhatsAppAddress } from "@/lib/twilio-whatsapp";

export const runtime = "nodejs";

function fullWebhookUrl(request: Request) { const origin = process.env.APP_URL?.replace(/\/$/, ""); const url = new URL(request.url); return origin ? `${origin}${url.pathname}${url.search}` : url.toString(); }
function hasValidSignature(request: Request, params: URLSearchParams) { const token = process.env.TWILIO_AUTH_TOKEN; const received = request.headers.get("x-twilio-signature"); if (!token || !received) return false; const signed = `${fullWebhookUrl(request)}${[...new Set([...params.keys()])].sort().flatMap((key) => params.getAll(key).sort().map((value) => `${key}${value}`)).join("")}`; const expected = createHmac("sha1", token).update(signed).digest("base64"); return expected.length === received.length && timingSafeEqual(Buffer.from(expected), Buffer.from(received)); }
function emptyTwiml() { return new Response("<?xml version=\"1.0\" encoding=\"UTF-8\"?><Response/>", { status: 200, headers: { "Content-Type": "text/xml" } }); }

export async function POST(request: Request) {
  const form = await request.formData(); const params = new URLSearchParams(); for (const [key, value] of form.entries()) params.append(key, typeof value === "string" ? value : value.name);
  if (!hasValidSignature(request, params)) { logger.warn("whatsapp.invalid_signature", {}); return new Response("Invalid signature", { status: 401 }); }
  const externalId = form.get("MessageSid")?.toString(); const from = form.get("From")?.toString(); const to = form.get("To")?.toString(); const body = form.get("Body")?.toString().trim();
  if (!externalId || !from || !to || !body) return emptyTwiml();
  if (await prisma.message.findUnique({ where: { externalId }, select: { id: true } })) return emptyTwiml();
  const sender = normalizeWhatsAppAddress(to); const integration = await prisma.integrationAccount.findFirst({ where: { provider: IntegrationProvider.TWILIO_WHATSAPP, externalPhoneNumberId: sender }, select: { cabinetId: true } });
  if (!integration) { logger.warn("whatsapp.unknown_sender", { sender }); return emptyTwiml(); }
  const phone = normalizeWhatsAppAddress(from); const profileName = form.get("ProfileName")?.toString().trim();
  await prisma.$transaction(async (tx) => {
    const patient = await tx.patient.upsert({ where: { cabinetId_phone: { cabinetId: integration.cabinetId, phone } }, update: { displayName: profileName || undefined }, create: { cabinetId: integration.cabinetId, phone, displayName: profileName || phone } });
    const conversation = await tx.conversation.findFirst({ where: { cabinetId: integration.cabinetId, patientId: patient.id, status: { in: [ConversationStatus.OPEN, ConversationStatus.WAITING_HUMAN] } }, orderBy: { updatedAt: "desc" } }) ?? await tx.conversation.create({ data: { cabinetId: integration.cabinetId, patientId: patient.id } });
    const inbound = await tx.message.create({ data: { conversationId: conversation.id, author: MessageAuthor.PATIENT, body, externalId } });
    await tx.inboundMessageJob.create({ data: { externalId, cabinetId: integration.cabinetId, conversationId: conversation.id, messageId: inbound.id } });
  });
  try {
    await processInboundMessageJobs(1);
  } catch (error) {
    logger.error("inbound_queue.processing_failed", { externalId, error });
  }
  return emptyTwiml();
}
