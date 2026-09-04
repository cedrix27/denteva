import { AppointmentStatus, IntegrationProvider } from "@prisma/client";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { sendWhatsAppTemplate } from "@/lib/whatsapp";
import { sendTwilioWhatsAppTemplate } from "@/lib/twilio-whatsapp";

export const runtime = "nodejs";

const formatter = new Intl.DateTimeFormat("fr-FR", { dateStyle: "full", timeStyle: "short", timeZone: "Africa/Casablanca" });

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return Response.json({ error: "Non autorisé." }, { status: 401 });
  const metaTemplate = process.env.WHATSAPP_REMINDER_TEMPLATE;
  const twilioTemplate = process.env.TWILIO_REMINDER_CONTENT_SID;
  if (!metaTemplate && !twilioTemplate) return Response.json({ sent: 0, skipped: 0, reason: "REMINDER_TEMPLATE_NOT_CONFIGURED" });

  const now = new Date();
  const from = new Date(now.getTime() + 23 * 60 * 60 * 1000);
  const to = new Date(now.getTime() + 25 * 60 * 60 * 1000);
  const appointments = await prisma.appointment.findMany({
    where: { startsAt: { gte: from, lte: to }, status: { in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED] }, automationDeliveries: { none: { key: "reminder_j1" } } },
    include: {
      patient: true,
      cabinet: {
        include: {
          automations: { where: { key: "reminder", enabled: true } },
          integrations: { where: { provider: { in: [IntegrationProvider.WHATSAPP_BUSINESS, IntegrationProvider.TWILIO_WHATSAPP] } }, take: 2 },
        },
      },
    },
  });
  let sent = 0; let skipped = 0;
  for (const appointment of appointments) {
    const integration = appointment.cabinet.integrations.find((item) => item.provider === IntegrationProvider.TWILIO_WHATSAPP) ?? appointment.cabinet.integrations[0];
    if (!appointment.cabinet.automations.length || !integration) { skipped += 1; continue; }
    try {
      const delivery = integration.provider === IntegrationProvider.TWILIO_WHATSAPP
        ? twilioTemplate ? await sendTwilioWhatsAppTemplate(appointment.patient.phone, twilioTemplate, { "1": appointment.patient.displayName, "2": formatter.format(appointment.startsAt), "3": appointment.cabinet.name }, integration.externalPhoneNumberId) : { delivered: false as const, reason: "TWILIO_TEMPLATE_NOT_CONFIGURED" }
        : metaTemplate ? await sendWhatsAppTemplate(integration, appointment.patient.phone, metaTemplate, appointment.patient.preferredLang, [appointment.patient.displayName, formatter.format(appointment.startsAt), appointment.cabinet.name]) : { delivered: false as const, reason: "META_TEMPLATE_NOT_CONFIGURED" };
      if (!delivery.delivered) { skipped += 1; continue; }
      await prisma.automationDelivery.create({ data: { cabinetId: appointment.cabinetId, appointmentId: appointment.id, key: "reminder_j1" } });
      sent += 1;
    } catch (error) { logger.error("reminder.delivery_failed", { appointmentId: appointment.id, cabinetId: appointment.cabinetId, error }); skipped += 1; }
  }
  logger.info("reminder.run_completed", { sent, skipped, scanned: appointments.length });
  return Response.json({ sent, skipped, scanned: appointments.length });
}
