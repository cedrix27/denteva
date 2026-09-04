import { decryptToken, encryptToken } from "@/lib/token-crypto";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

type AppointmentForSync = { id: string; cabinetId: string; startsAt: Date; endsAt: Date; reason: string | null; googleCalendarId?: string | null; patient: { displayName: string; phone: string } };

async function accessToken(cabinetId: string) {
  const integration = await prisma.integrationAccount.findUnique({ where: { cabinetId_provider: { cabinetId, provider: "GOOGLE_CALENDAR" } } });
  if (!integration?.encryptedAccessToken) return null;
  if (!integration.expiresAt || integration.expiresAt.getTime() > Date.now() + 60_000) return { token: decryptToken(integration.encryptedAccessToken), integration };
  if (!integration.encryptedRefreshToken || !process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) return null;
  const response = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID, client_secret: process.env.GOOGLE_CLIENT_SECRET, refresh_token: decryptToken(integration.encryptedRefreshToken), grant_type: "refresh_token" }) });
  const refreshed = await response.json() as { access_token?: string; expires_in?: number };
  if (!response.ok || !refreshed.access_token) {
    logger.error("google.token_refresh_failed", { cabinetId, status: response.status });
    return null;
  }
  const updated = await prisma.integrationAccount.update({ where: { id: integration.id }, data: { encryptedAccessToken: encryptToken(refreshed.access_token), expiresAt: refreshed.expires_in ? new Date(Date.now() + refreshed.expires_in * 1000) : null } });
  return { token: refreshed.access_token, integration: updated };
}

export async function syncAppointmentToGoogle(appointment: AppointmentForSync) {
  const credentials = await accessToken(appointment.cabinetId);
  if (!credentials) return { synced: false as const, reason: "NOT_CONNECTED" };
  const calendarId = credentials.integration.selectedCalendarId || "primary";
  const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`, { method: "POST", headers: { Authorization: `Bearer ${credentials.token}`, "Content-Type": "application/json" }, body: JSON.stringify({ summary: `Rendez-vous — ${appointment.patient.displayName}`, description: [appointment.reason || "Consultation dentaire", `Patient : ${appointment.patient.displayName}`, `Téléphone : ${appointment.patient.phone}`].join("\n"), start: { dateTime: appointment.startsAt.toISOString(), timeZone: "Africa/Casablanca" }, end: { dateTime: appointment.endsAt.toISOString(), timeZone: "Africa/Casablanca" }, extendedProperties: { private: { dentaAppointmentId: appointment.id } } }) });
  const event = await response.json().catch(() => null) as { id?: string } | null;
  if (!response.ok || !event?.id) {
    logger.error("google.event_rejected", { cabinetId: appointment.cabinetId, appointmentId: appointment.id, status: response.status });
    return { synced: false as const, reason: "GOOGLE_REJECTED" };
  }
  await prisma.appointment.update({ where: { id: appointment.id }, data: { googleCalendarId: event.id } });
  return { synced: true as const, googleCalendarId: event.id };
}

export async function updateAppointmentOnGoogle(appointment: AppointmentForSync) {
  if (!appointment.googleCalendarId) return syncAppointmentToGoogle(appointment);
  const credentials = await accessToken(appointment.cabinetId);
  if (!credentials) return { synced: false as const, reason: "NOT_CONNECTED" };
  const calendarId = credentials.integration.selectedCalendarId || "primary";
  const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(appointment.googleCalendarId)}`, { method: "PATCH", headers: { Authorization: `Bearer ${credentials.token}`, "Content-Type": "application/json" }, body: JSON.stringify({ summary: `Rendez-vous — ${appointment.patient.displayName}`, description: [appointment.reason || "Consultation dentaire", `Patient : ${appointment.patient.displayName}`, `Téléphone : ${appointment.patient.phone}`].join("\n"), start: { dateTime: appointment.startsAt.toISOString(), timeZone: "Africa/Casablanca" }, end: { dateTime: appointment.endsAt.toISOString(), timeZone: "Africa/Casablanca" } }) });
  if (!response.ok) { logger.error("google.event_update_rejected", { cabinetId: appointment.cabinetId, appointmentId: appointment.id, status: response.status }); return { synced: false as const, reason: "GOOGLE_REJECTED" }; }
  return { synced: true as const, googleCalendarId: appointment.googleCalendarId };
}

export async function cancelAppointmentOnGoogle(appointment: AppointmentForSync) {
  if (!appointment.googleCalendarId) return { synced: false as const, reason: "NOT_SYNCED" };
  const credentials = await accessToken(appointment.cabinetId);
  if (!credentials) return { synced: false as const, reason: "NOT_CONNECTED" };
  const calendarId = credentials.integration.selectedCalendarId || "primary";
  const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(appointment.googleCalendarId)}`, { method: "DELETE", headers: { Authorization: `Bearer ${credentials.token}` } });
  if (!response.ok && response.status !== 404) { logger.error("google.event_delete_rejected", { cabinetId: appointment.cabinetId, appointmentId: appointment.id, status: response.status }); return { synced: false as const, reason: "GOOGLE_REJECTED" }; }
  return { synced: true as const };
}
