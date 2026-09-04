import { decryptToken } from "@/lib/token-crypto";
import { logger } from "@/lib/logger";

type WhatsAppAccount = { externalPhoneNumberId: string | null; encryptedAccessToken: string | null };

function accountIsReady(account: WhatsAppAccount) {
  return Boolean(account.externalPhoneNumberId && account.encryptedAccessToken);
}

async function send(account: WhatsAppAccount, payload: Record<string, unknown>) {
  if (!accountIsReady(account)) return { delivered: false as const, reason: "NOT_CONNECTED" };
  const token = decryptToken(account.encryptedAccessToken!);
  const version = process.env.META_GRAPH_API_VERSION || "v22.0";
  const response = await fetch(`https://graph.facebook.com/${version}/${account.externalPhoneNumberId}/messages`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ messaging_product: "whatsapp", ...payload }) });
  if (!response.ok) {
    logger.error("meta.rejected", { status: response.status, phoneNumberId: account.externalPhoneNumberId, body: (await response.text()).slice(0, 500) });
    return { delivered: false as const, reason: "META_REJECTED" };
  }
  const data = await response.json() as { messages?: Array<{ id?: string }> };
  return { delivered: true as const, externalId: data.messages?.[0]?.id ?? null };
}

export function sendWhatsAppText(account: WhatsAppAccount, to: string, body: string) {
  return send(account, { to, type: "text", text: { preview_url: false, body } });
}

export function sendWhatsAppTemplate(account: WhatsAppAccount, to: string, name: string, language: string, values: string[]) {
  return send(account, { to, type: "template", template: { name, language: { code: language === "darija" ? "fr" : language || "fr" }, components: [{ type: "body", parameters: values.map((text) => ({ type: "text", text })) }] } });
}

export function sendLanguageSelection(account: WhatsAppAccount, to: string, languages: string[]) {
  const labels: Record<string, string> = { fr: "Français", en: "English", darija: "Darija" };
  const buttons = languages.filter((language) => labels[language]).slice(0, 3).map((language) => ({ type: "reply", reply: { id: `lang:${language}`, title: labels[language] } }));
  if (!buttons.length) return Promise.resolve({ delivered: false as const, reason: "NO_LANGUAGE" });
  return send(account, { to, type: "interactive", interactive: { type: "button", body: { text: "Bonjour 👋 Choisissez votre langue pour continuer." }, action: { buttons } } });
}
