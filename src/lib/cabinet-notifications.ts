import { Prisma } from "@prisma/client";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

type Settings = { daily?: boolean; urgent?: boolean; summary?: boolean };
const timezone = "Africa/Casablanca";
const dateFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" });
const timeFormatter = new Intl.DateTimeFormat("fr-FR", { timeZone: timezone, dateStyle: "full", timeStyle: "short" });

function setting(value: unknown, key: keyof Settings, fallback: boolean) { return typeof value === "object" && value !== null && key in value ? Boolean((value as Settings)[key]) : fallback; }
function escapeHtml(value: string) { return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character); }
function dashboardUrl(path: string) { return `${process.env.APP_URL?.replace(/\/$/, "") ?? ""}${path}`; }

async function sendEmail(to: string[], subject: string, html: string, text: string) {
  const apiKey = process.env.RESEND_API_KEY; const from = process.env.EMAIL_FROM;
  if (!apiKey || !from || !to.length) return false;
  const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "User-Agent": "Denta-Assistant/1.0" }, body: JSON.stringify({ from, to, subject, html, text }) });
  if (!response.ok) logger.error("notifications.email_rejected", { status: response.status });
  return response.ok;
}

async function reserveDelivery(cabinetId: string, key: string, period: string) {
  try { const delivery = await prisma.notificationDelivery.create({ data: { cabinetId, key, period } }); return delivery.id; }
  catch (error) { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return null; logger.error("notifications.reserve_failed", { cabinetId, key, error }); return null; }
}
async function releaseDelivery(id: string) { await prisma.notificationDelivery.delete({ where: { id } }).catch(() => undefined); }
function recipientEmails(cabinet: { members: Array<{ user: { email: string } }> }) { return [...new Set(cabinet.members.map((member) => member.user.email).filter(Boolean))]; }

export function isUrgentDentalMessage(body: string) { const text = body.toLowerCase(); return ["urgence", "urgent", "douleur intense", "douleur insupportable", "saignement", "gonflement", "dent cassée", "dent cassee", "accident", "traumatisme", "حالة مستعجلة", "ألم شديد", "وجع شديد", "نزيف", "تورم"].some((keyword) => text.includes(keyword)); }

export async function notifyUrgentConversation(cabinetId: string, conversationId: string) {
  const conversation = await prisma.conversation.findFirst({ where: { id: conversationId, cabinetId }, include: { patient: true, cabinet: { include: { members: { include: { user: { select: { email: true } } } } } } } });
  if (!conversation || !setting(conversation.cabinet.notificationSettings, "urgent", true)) return false;
  const deliveryId = await reserveDelivery(cabinetId, "urgent_conversation", conversationId); if (!deliveryId) return false;
  const subject = `Urgence à traiter — ${conversation.cabinet.name}`; const safeName = escapeHtml(conversation.patient.displayName); const safePhone = escapeHtml(conversation.patient.phone); const url = dashboardUrl("/cabinet/inbox");
  const sent = await sendEmail(recipientEmails(conversation.cabinet), subject, `<div style="font-family:Arial,sans-serif;color:#171716"><h1 style="font-size:21px">Urgence signalée</h1><p>Un message potentiellement urgent nécessite l’attention de l’équipe.</p><p><strong>${safeName}</strong><br>${safePhone}</p><p><a href="${url}" style="display:inline-block;background:#171716;color:#fff;padding:12px 18px;border-radius:10px;text-decoration:none">Ouvrir l’Inbox</a></p></div>`, `Urgence signalée par ${conversation.patient.displayName} (${conversation.patient.phone}). Ouvrir l’Inbox : ${url}`);
  if (!sent) await releaseDelivery(deliveryId); return sent;
}

export async function sendDailySchedules() {
  const today = dateFormatter.format(new Date()); const windowStart = new Date(Date.now() - 12 * 60 * 60_000); const windowEnd = new Date(Date.now() + 36 * 60 * 60_000);
  const cabinets = await prisma.cabinet.findMany({ include: { members: { include: { user: { select: { email: true } } } }, appointments: { where: { startsAt: { gte: windowStart, lte: windowEnd }, status: { in: ["PENDING", "CONFIRMED"] } }, include: { patient: true }, orderBy: { startsAt: "asc" } } } });
  let sent = 0; for (const cabinet of cabinets) { if (!setting(cabinet.notificationSettings, "daily", true)) continue; const appointments = cabinet.appointments.filter((appointment) => dateFormatter.format(appointment.startsAt) === today); const deliveryId = await reserveDelivery(cabinet.id, "daily_schedule", today); if (!deliveryId) continue; const rows = appointments.length ? appointments.map((appointment) => `<li><strong>${escapeHtml(timeFormatter.format(appointment.startsAt))}</strong> — ${escapeHtml(appointment.patient.displayName)}${appointment.reason ? ` · ${escapeHtml(appointment.reason)}` : ""}</li>`).join("") : "<li>Aucun rendez-vous prévu.</li>"; const ok = await sendEmail(recipientEmails(cabinet), `Programme du jour — ${cabinet.name}`, `<div style="font-family:Arial,sans-serif;color:#171716"><h1 style="font-size:21px">Programme du jour</h1><p>${escapeHtml(cabinet.name)} · ${appointments.length} rendez-vous</p><ul>${rows}</ul><p><a href="${dashboardUrl("/cabinet/appointments")}">Ouvrir l’agenda</a></p></div>`, `Programme du jour ${cabinet.name} : ${appointments.length} rendez-vous.`); if (ok) sent += 1; else await releaseDelivery(deliveryId); }
  return { sent };
}

export async function sendWeeklySummaries() {
  const now = new Date(); const since = new Date(now.getTime() - 7 * 24 * 60 * 60_000); const period = `${dateFormatter.format(since)}-${dateFormatter.format(now)}`;
  const cabinets = await prisma.cabinet.findMany({ include: { members: { include: { user: { select: { email: true } } } }, _count: { select: { conversations: { where: { updatedAt: { gte: since } } }, appointments: { where: { startsAt: { gte: since } } } } } } });
  let sent = 0; for (const cabinet of cabinets) { if (!setting(cabinet.notificationSettings, "summary", false)) continue; const deliveryId = await reserveDelivery(cabinet.id, "weekly_summary", period); if (!deliveryId) continue; const conversations = cabinet._count.conversations; const appointments = cabinet._count.appointments; const ok = await sendEmail(recipientEmails(cabinet), `Bilan hebdomadaire — ${cabinet.name}`, `<div style="font-family:Arial,sans-serif;color:#171716"><h1 style="font-size:21px">Bilan hebdomadaire</h1><p>${escapeHtml(cabinet.name)}</p><p><strong>${conversations}</strong> conversations traitées<br><strong>${appointments}</strong> rendez-vous enregistrés</p><p><a href="${dashboardUrl("/cabinet")}">Ouvrir le tableau de bord</a></p></div>`, `Bilan ${cabinet.name} : ${conversations} conversations, ${appointments} rendez-vous.`); if (ok) sent += 1; else await releaseDelivery(deliveryId); }
  return { sent };
}
