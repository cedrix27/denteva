import { logger } from "@/lib/logger";

type Delivery = { delivered: true; externalId: string | null } | { delivered: false; reason: string };
export type TwilioWhatsAppSender = { sid: string; phoneNumber: string; status: string; friendlyName: string | null; qualityRating: string | null; messagingLimit: string | null };

export function normalizeWhatsAppAddress(value: string) {
  return value.trim().replace(/^whatsapp:/i, "");
}

export function configuredTwilioSender() {
  const sender = process.env.TWILIO_WHATSAPP_FROM?.trim();
  return sender ? normalizeWhatsAppAddress(sender) : null;
}

export function twilioIsConfigured() {
  return Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && configuredTwilioSender());
}

function twilioCredentials() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !authToken) return null;
  return { accountSid, authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}` };
}

export async function getTwilioWhatsAppSenders(): Promise<TwilioWhatsAppSender[] | null> {
  const credentials = twilioCredentials();
  if (!credentials) return null;
  const response = await fetch("https://messaging.twilio.com/v2/Channels/Senders?Channel=whatsapp&PageSize=1000&Page=0", { headers: { Authorization: credentials.authorization }, cache: "no-store" });
  if (!response.ok) { logger.error("twilio.senders_list_rejected", { status: response.status }); return null; }
  const payload = await response.json() as { senders?: Array<{ sid?: string; senderId?: string; sender_id?: string; status?: string; friendlyName?: string; friendly_name?: string; qualityRating?: string; quality_rating?: string; messagingLimit?: string; messaging_limit?: string }> };
  return (payload.senders ?? []).map((sender) => {
    const address = sender.senderId ?? sender.sender_id ?? "";
    return { sid: sender.sid ?? "", phoneNumber: normalizeWhatsAppAddress(address), status: sender.status ?? "UNKNOWN", friendlyName: sender.friendlyName ?? sender.friendly_name ?? null, qualityRating: sender.qualityRating ?? sender.quality_rating ?? null, messagingLimit: sender.messagingLimit ?? sender.messaging_limit ?? null };
  }).filter((sender) => /^\+\d{8,15}$/.test(sender.phoneNumber));
}

export async function getOnlineTwilioWhatsAppSender(phoneNumber: string) {
  const senders = await getTwilioWhatsAppSenders();
  if (!senders) return null;
  return senders.find((sender) => sender.phoneNumber === normalizeWhatsAppAddress(phoneNumber) && sender.status === "ONLINE") ?? false;
}

function twilioAddress(phone: string) {
  return `whatsapp:${normalizeWhatsAppAddress(phone)}`;
}

async function createMessage(params: Record<string, string>, senderOverride?: string | null): Promise<Delivery> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const sender = senderOverride ? normalizeWhatsAppAddress(senderOverride) : configuredTwilioSender();
  if (!accountSid || !authToken || !sender) return { delivered: false, reason: "NOT_CONFIGURED" };

  const payload = new URLSearchParams({ From: twilioAddress(sender), ...params });
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: payload,
  });
  if (!response.ok) {
    logger.error("twilio.rejected", { status: response.status, sender, body: (await response.text()).slice(0, 500) });
    return { delivered: false, reason: "TWILIO_REJECTED" };
  }
  const data = await response.json() as { sid?: string };
  return { delivered: true, externalId: data.sid ?? null };
}

export function sendTwilioWhatsAppText(to: string, body: string, senderOverride?: string | null) {
  return createMessage({ To: twilioAddress(to), Body: body }, senderOverride);
}

export function sendTwilioLanguageSelection(to: string, languages: string[], senderOverride?: string | null) {
  const choices = languages.filter((language) => ["fr", "en", "darija"].includes(language));
  const labels: Record<string, string> = { fr: "1. Français", en: "2. English", darija: "3. Darija" };
  const body = ["Bonjour 👋", "Choisissez votre langue en répondant avec le numéro :", ...choices.map((language) => labels[language])].join("\n");
  return sendTwilioWhatsAppText(to, body, senderOverride);
}

export function sendTwilioWhatsAppTemplate(to: string, contentSid: string, variables: Record<string, string>, senderOverride?: string | null) {
  return createMessage({ To: twilioAddress(to), ContentSid: contentSid, ContentVariables: JSON.stringify(variables) }, senderOverride);
}
