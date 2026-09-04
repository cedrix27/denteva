import { IntegrationProvider, PlatformRole } from "@prisma/client";
import { getCurrentUserRecord } from "@/lib/current-cabinet";
import { prisma } from "@/lib/prisma";
import { getOnlineTwilioWhatsAppSender, normalizeWhatsAppAddress } from "@/lib/twilio-whatsapp";

type Context = { params: Promise<{ cabinetId: string }> };
export async function POST(request: Request, { params }: Context) {
  const user = await getCurrentUserRecord();
  if (user?.platformRole !== PlatformRole.PLATFORM_ADMIN) return Response.json({ error: "Accès refusé." }, { status: 403 });
  const { cabinetId } = await params; const body = await request.json().catch(() => null) as { phoneNumber?: unknown } | null;
  const phoneNumber = typeof body?.phoneNumber === "string" ? normalizeWhatsAppAddress(body.phoneNumber) : "";
  if (!/^\+\d{8,15}$/.test(phoneNumber)) return Response.json({ error: "Indiquez un numéro international valide." }, { status: 422 });
  const sender = await getOnlineTwilioWhatsAppSender(phoneNumber);
  if (sender === null) return Response.json({ error: "Twilio est indisponible ou ses identifiants ne sont pas configurés." }, { status: 503 });
  if (!sender) return Response.json({ error: "Ce numéro n’est pas un expéditeur WhatsApp Twilio actif (ONLINE) de votre compte." }, { status: 422 });
  const cabinet = await prisma.cabinet.findUnique({ where: { id: cabinetId }, select: { id: true } });
  if (!cabinet) return Response.json({ error: "Cabinet introuvable." }, { status: 404 });
  const used = await prisma.integrationAccount.findFirst({ where: { provider: IntegrationProvider.TWILIO_WHATSAPP, externalPhoneNumberId: phoneNumber, cabinetId: { not: cabinetId } }, select: { id: true } });
  if (used) return Response.json({ error: "Ce numéro est déjà attribué à un autre cabinet." }, { status: 409 });
  const integration = await prisma.integrationAccount.upsert({ where: { cabinetId_provider: { cabinetId, provider: IntegrationProvider.TWILIO_WHATSAPP } }, update: { externalAccountId: process.env.TWILIO_ACCOUNT_SID, externalPhoneNumberId: phoneNumber, displayPhoneNumber: phoneNumber, metadata: { senderSid: sender.sid, senderStatus: sender.status, friendlyName: sender.friendlyName, qualityRating: sender.qualityRating, messagingLimit: sender.messagingLimit } }, create: { cabinetId, provider: IntegrationProvider.TWILIO_WHATSAPP, externalAccountId: process.env.TWILIO_ACCOUNT_SID, externalPhoneNumberId: phoneNumber, displayPhoneNumber: phoneNumber, metadata: { senderSid: sender.sid, senderStatus: sender.status, friendlyName: sender.friendlyName, qualityRating: sender.qualityRating, messagingLimit: sender.messagingLimit } } });
  return Response.json({ integration });
}
