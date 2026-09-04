import { IntegrationProvider, MessageAuthor } from "@prisma/client";
import { getCurrentCabinet } from "@/lib/current-cabinet";
import { prisma } from "@/lib/prisma";
import { sendTwilioWhatsAppText } from "@/lib/twilio-whatsapp";
import { sendWhatsAppText } from "@/lib/whatsapp";
import { respondToError } from "@/lib/api-errors";

type Context = { params: Promise<{ conversationId: string }> };
export async function POST(request: Request, { params }: Context) {
  const body = await request.json().catch(() => null) as { body?: unknown } | null;
  const text = typeof body?.body === "string" ? body.body.trim() : "";
  if (!text || text.length > 4000) return Response.json({ error: "Message invalide." }, { status: 422 });
  try {
    const { conversationId } = await params; const cabinet = await getCurrentCabinet();
    const conversation = await prisma.conversation.findFirst({ where: { id: conversationId, cabinetId: cabinet.id }, include: { patient: true } });
    if (!conversation) return Response.json({ error: "Introuvable." }, { status: 404 });
    const [twilio, meta] = await Promise.all([prisma.integrationAccount.findUnique({ where: { cabinetId_provider: { cabinetId: cabinet.id, provider: IntegrationProvider.TWILIO_WHATSAPP } } }), prisma.integrationAccount.findUnique({ where: { cabinetId_provider: { cabinetId: cabinet.id, provider: IntegrationProvider.WHATSAPP_BUSINESS } } })]);
    const delivery = twilio ? await sendTwilioWhatsAppText(conversation.patient.phone, text, twilio.externalPhoneNumberId) : meta ? await sendWhatsAppText(meta, conversation.patient.phone, text) : { delivered: false as const, reason: "NOT_CONNECTED" };
    const message = await prisma.message.create({ data: { conversationId, author: MessageAuthor.TEAM_MEMBER, body: text, externalId: delivery.delivered ? delivery.externalId ?? undefined : undefined } });
    await prisma.conversation.update({ where: { id: conversationId }, data: { status: "WAITING_HUMAN" } });
    return Response.json({ message, delivered: delivery.delivered }, { status: 201 });
  } catch (error) { return respondToError("api/cabinet/conversations/[conversationId]/messages", error); }
}
