import { AppointmentStatus, ConversationStatus, IntegrationProvider, MessageAuthor } from "@prisma/client";
import { getCurrentCabinet } from "@/lib/current-cabinet";
import { prisma } from "@/lib/prisma";
import { respondToError } from "@/lib/api-errors";

export async function GET() {
  try {
    const cabinet = await getCurrentCabinet(); const now = new Date(); const start = new Date(now); start.setHours(0, 0, 0, 0); const end = new Date(start); end.setDate(end.getDate() + 1);
    const [messages, automated, urgent, appointments, waiting, whatsapp, calendar, knowledge] = await Promise.all([
      prisma.message.count({ where: { conversation: { cabinetId: cabinet.id }, createdAt: { gte: start, lt: end } } }),
      prisma.message.count({ where: { conversation: { cabinetId: cabinet.id }, author: MessageAuthor.ASSISTANT, createdAt: { gte: start, lt: end } } }),
      prisma.conversation.count({ where: { cabinetId: cabinet.id, urgent: true, status: { in: [ConversationStatus.OPEN, ConversationStatus.WAITING_HUMAN] } } }),
      prisma.appointment.findMany({ where: { cabinetId: cabinet.id, startsAt: { gte: start, lt: end }, status: { in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED] } }, include: { patient: true }, orderBy: { startsAt: "asc" } }),
      prisma.conversation.findMany({ where: { cabinetId: cabinet.id, status: ConversationStatus.WAITING_HUMAN }, include: { patient: true, messages: { orderBy: { createdAt: "desc" }, take: 1 } }, orderBy: { updatedAt: "desc" }, take: 3 }),
      prisma.integrationAccount.count({ where: { cabinetId: cabinet.id, provider: IntegrationProvider.TWILIO_WHATSAPP, externalPhoneNumberId: { not: null } } }),
      prisma.integrationAccount.count({ where: { cabinetId: cabinet.id, provider: IntegrationProvider.GOOGLE_CALENDAR, selectedCalendarId: { not: null } } }),
      prisma.knowledgeBaseEntry.count({ where: { cabinetId: cabinet.id, status: "ACTIVE" } }),
    ]);
    return Response.json({ cabinet: { name: cabinet.name, practitionerName: cabinet.practitionerName }, metrics: { messages, appointments: appointments.length, automatedPercent: messages ? Math.round(automated / messages * 100) : 0, urgent }, appointments, waiting, setup: { profile: Boolean(cabinet.phone && cabinet.address && cabinet.city), whatsapp: whatsapp > 0, calendar: calendar > 0, knowledge: knowledge > 0 } });
  } catch (error) { return respondToError("api/cabinet/dashboard", error); }
}
