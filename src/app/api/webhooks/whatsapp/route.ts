import { createHmac, timingSafeEqual } from "node:crypto";
import { MessageAuthor } from "@prisma/client";
import { NextResponse, after } from "next/server";
import { generateConversationReply, isConversationThrottled, type CabinetContext } from "@/lib/ai/conversation-reply";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { sendLanguageSelection, sendWhatsAppText } from "@/lib/whatsapp";

export const maxDuration = 60;

type MetaAccount = Parameters<typeof sendWhatsAppText>[0];

/** Runs after Meta receives the 200, so the webhook never waits on the model. */
async function replyWithAssistant(job: { account: MetaAccount; cabinet: CabinetContext; conversationId: string; inboundMessageId: string; language: string; patientId: string; to: string; message: string }) {
  const reply = await generateConversationReply(job);
  if (!reply.ok) {
    // No usable answer: hand the conversation to the team rather than stay silent.
    await prisma.conversation.update({ where: { id: job.conversationId }, data: { status: "WAITING_HUMAN" } });
    logger.warn("assistant.handed_over_to_team", { cabinetId: job.cabinet.id, conversationId: job.conversationId, reason: reply.reason });
    return;
  }
  const sent = await sendWhatsAppText(job.account, job.to, reply.text);
  if (!sent.delivered) {
    logger.error("whatsapp.delivery_failed", { cabinetId: job.cabinet.id, conversationId: job.conversationId, reason: sent.reason });
    return;
  }
  await prisma.message.create({ data: { conversationId: job.conversationId, author: MessageAuthor.ASSISTANT, body: reply.text, externalId: sent.externalId ?? undefined } });
}

type WebhookMessage = { id?: string; from?: string; timestamp?: string; type?: string; text?: { body?: string }; interactive?: { type?: string; button_reply?: { id?: string; title?: string } } };
type WebhookValue = { metadata?: { phone_number_id?: string }; contacts?: Array<{ wa_id?: string; profile?: { name?: string } }>; messages?: WebhookMessage[] };
type WebhookPayload = { object?: string; entry?: Array<{ changes?: Array<{ field?: string; value?: WebhookValue }> }> };

function hasValidSignature(rawBody: string, signature: string | null) {
  const secret = process.env.META_APP_SECRET;
  if (!secret || !signature?.startsWith("sha256=")) return false;
  const expected = `sha256=${createHmac("sha256", secret).update(rawBody).digest("hex")}`;
  return expected.length === signature.length && timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  if (mode === "subscribe" && token && token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN && challenge) return new NextResponse(challenge, { status: 200 });
  return new NextResponse("Forbidden", { status: 403 });
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (!hasValidSignature(rawBody, request.headers.get("x-hub-signature-256"))) return new NextResponse("Invalid signature", { status: 401 });

  const payload = JSON.parse(rawBody) as WebhookPayload;
  if (payload.object !== "whatsapp_business_account") return NextResponse.json({ received: true });

  for (const entry of payload.entry ?? []) for (const change of entry.changes ?? []) {
    if (change.field !== "messages") continue;
    const value = change.value;
    if (!value) continue;
    const phoneNumberId = value.metadata?.phone_number_id;
    if (!phoneNumberId) continue;
    const integration = await prisma.integrationAccount.findFirst({ where: { provider: "WHATSAPP_BUSINESS", externalPhoneNumberId: phoneNumberId } });
    if (!integration) continue;
    const cabinet = await prisma.cabinet.findUnique({ where: { id: integration.cabinetId } });
    if (!cabinet) continue;

    for (const message of value.messages ?? []) {
      if (!message.id || !message.from) continue;
      if (await prisma.message.findUnique({ where: { externalId: message.id }, select: { id: true } })) continue;
      const language = message.type === "interactive" && message.interactive?.type === "button_reply" ? message.interactive.button_reply?.id?.replace("lang:", "") : null;
      if (language && ["fr", "en", "darija"].includes(language) && cabinet.supportedLanguages.includes(language)) {
        const contact = value.contacts?.find((item) => item.wa_id === message.from);
        const patient = await prisma.patient.upsert({ where: { cabinetId_phone: { cabinetId: integration.cabinetId, phone: message.from } }, update: { displayName: contact?.profile?.name ?? undefined, preferredLang: language }, create: { cabinetId: integration.cabinetId, phone: message.from, displayName: contact?.profile?.name || message.from, preferredLang: language } });
        const conversation = await prisma.conversation.findFirst({ where: { cabinetId: integration.cabinetId, patientId: patient.id, status: { in: ["OPEN", "WAITING_HUMAN"] } }, orderBy: { updatedAt: "desc" } }) ?? await prisma.conversation.create({ data: { cabinetId: integration.cabinetId, patientId: patient.id, intakeState: "OPEN" } });
        await prisma.conversation.update({ where: { id: conversation.id }, data: { intakeState: "OPEN" } });
        await prisma.message.create({ data: { conversationId: conversation.id, author: MessageAuthor.PATIENT, body: message.interactive?.button_reply?.title || language, externalId: message.id, createdAt: message.timestamp ? new Date(Number(message.timestamp) * 1000) : undefined } });
        const welcome = language === "en" ? "Thank you. How can we help you today?" : language === "darija" ? "شكراً. كيف نقدروا نعاونك اليوم؟" : "Merci. Comment pouvons-nous vous aider aujourd’hui ?";
        after(async () => {
          const sent = await sendWhatsAppText(integration, message.from!, welcome);
          if (sent.delivered) await prisma.message.create({ data: { conversationId: conversation.id, author: MessageAuthor.ASSISTANT, body: welcome, externalId: sent.externalId ?? undefined } });
        });
        continue;
      }
      if (!message.id || !message.from || message.type !== "text" || !message.text?.body) continue;
      const contact = value.contacts?.find((item) => item.wa_id === message.from);
      const patient = await prisma.patient.upsert({ where: { cabinetId_phone: { cabinetId: integration.cabinetId, phone: message.from } }, update: { displayName: contact?.profile?.name ?? undefined }, create: { cabinetId: integration.cabinetId, phone: message.from, displayName: contact?.profile?.name || message.from } });
      const conversation = await prisma.conversation.findFirst({ where: { cabinetId: integration.cabinetId, patientId: patient.id, status: { in: ["OPEN", "WAITING_HUMAN"] } }, orderBy: { updatedAt: "desc" } }) ?? await prisma.conversation.create({ data: { cabinetId: integration.cabinetId, patientId: patient.id } });
      const inbound = await prisma.message.create({ data: { conversationId: conversation.id, author: MessageAuthor.PATIENT, body: message.text.body, externalId: message.id, createdAt: message.timestamp ? new Date(Number(message.timestamp) * 1000) : undefined } });
      if (conversation.intakeState === "LANGUAGE_SELECTION") { const to = message.from; after(() => sendLanguageSelection(integration, to, cabinet.supportedLanguages)); continue; }
      if (conversation.status === "WAITING_HUMAN") continue;
      if (await isConversationThrottled(conversation.id)) { await prisma.conversation.update({ where: { id: conversation.id }, data: { status: "WAITING_HUMAN" } }); continue; }
      const job = { account: integration, cabinet, conversationId: conversation.id, inboundMessageId: inbound.id, language: patient.preferredLang, patientId: patient.id, to: message.from, message: message.text.body };
      after(() => replyWithAssistant(job));
    }
  }
  return NextResponse.json({ received: true });
}
