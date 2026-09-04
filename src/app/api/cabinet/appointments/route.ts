import { AppointmentStatus } from "@prisma/client";
import { getCurrentCabinet } from "@/lib/current-cabinet";
import { prisma } from "@/lib/prisma";
import { syncAppointmentToGoogle } from "@/lib/google-calendar";
import { respondToError } from "@/lib/api-errors";

const visibleStatuses = Object.values(AppointmentStatus);

function parseDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function GET(request: Request) {
  try {
    const cabinet = await getCurrentCabinet();
    const { searchParams } = new URL(request.url);
    const from = parseDate(searchParams.get("from"));
    const to = parseDate(searchParams.get("to"));
    const appointments = await prisma.appointment.findMany({
      where: { cabinetId: cabinet.id, ...(from || to ? { startsAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}) },
      include: { patient: true }, orderBy: { startsAt: "asc" },
    });
    return Response.json({ appointments, openingHours: cabinet.openingHours });
  } catch (error) { return respondToError("api/cabinet/appointments", error); }
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { patientName?: string; patientPhone?: string; startsAt?: string; endsAt?: string; reason?: string; status?: string } | null;
  const patientName = body?.patientName?.trim();
  const patientPhone = body?.patientPhone?.trim();
  const startsAt = body?.startsAt ? new Date(body.startsAt) : null;
  const endsAt = body?.endsAt ? new Date(body.endsAt) : null;
  const status = body?.status ?? "PENDING";
  if (!patientName || !patientPhone || !startsAt || !endsAt || Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || endsAt <= startsAt || !visibleStatuses.includes(status as AppointmentStatus)) return Response.json({ error: "Les informations du rendez-vous sont invalides." }, { status: 422 });
  try {
    const cabinet = await getCurrentCabinet();
    const conflict = await prisma.appointment.findFirst({ where: { cabinetId: cabinet.id, status: { not: AppointmentStatus.CANCELLED }, startsAt: { lt: endsAt }, endsAt: { gt: startsAt } }, select: { id: true } });
    if (conflict) return Response.json({ error: "Ce créneau est déjà occupé." }, { status: 409 });
    const patient = await prisma.patient.upsert({ where: { cabinetId_phone: { cabinetId: cabinet.id, phone: patientPhone } }, update: { displayName: patientName }, create: { cabinetId: cabinet.id, displayName: patientName, phone: patientPhone } });
    const appointment = await prisma.appointment.create({ data: { cabinetId: cabinet.id, patientId: patient.id, startsAt, endsAt, reason: body?.reason?.trim() || null, status: status as AppointmentStatus }, include: { patient: true } });
    const sync = await syncAppointmentToGoogle(appointment).catch(() => ({ synced: false as const, reason: "SYNC_FAILED" }));
    return Response.json({ appointment: sync.synced ? { ...appointment, googleCalendarId: sync.googleCalendarId } : appointment, googleSynced: sync.synced }, { status: 201 });
  } catch (error) { return respondToError("api/cabinet/appointments", error); }
}
