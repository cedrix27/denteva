import { logger } from "@/lib/logger";

type InvitationInput = { recipient: string; cabinetName: string; role: string };
type Delivery = "sent" | "not_configured" | "failed";

function escapeHtml(value: string) { return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character); }

export async function sendTeamInvitationEmail({ recipient, cabinetName, role }: InvitationInput): Promise<Delivery> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  const appUrl = process.env.APP_URL?.replace(/\/$/, "");
  if (!apiKey || !from || !appUrl) return "not_configured";
  const roleLabel = role === "PRACTITIONER" ? "praticien·ne" : "membre de la réception";
  const signUpUrl = `${appUrl}/auth/sign-up`;
  const safeCabinet = escapeHtml(cabinetName);
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "User-Agent": "Denta-Assistant/1.0" },
    body: JSON.stringify({ from, to: [recipient], subject: `Invitation à rejoindre ${cabinetName} sur Denteva`, text: `Vous êtes invité(e) à rejoindre ${cabinetName} comme ${roleLabel}. Créez votre compte avec cette adresse e-mail : ${signUpUrl}`, html: `<div style="font-family:Arial,sans-serif;color:#171716;line-height:1.5"><h1 style="font-size:22px">Vous êtes invité(e)</h1><p>Le cabinet <strong>${safeCabinet}</strong> vous invite à rejoindre son espace Denteva comme <strong>${roleLabel}</strong>.</p><p>Créez votre compte avec cette même adresse e-mail pour accéder au cabinet.</p><p><a href="${signUpUrl}" style="display:inline-block;background:#171716;color:#fff;padding:12px 18px;border-radius:10px;text-decoration:none">Créer mon compte</a></p><p style="font-size:12px;color:#77736f">Si vous possédez déjà un compte avec cette adresse, connectez-vous simplement.</p></div>` }),
  });
  if (response.ok) return "sent";
  logger.error("team_invitation.email_rejected", { status: response.status });
  return "failed";
}
