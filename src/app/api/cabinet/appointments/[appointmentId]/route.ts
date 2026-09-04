import { AppointmentStatus } from "@prisma/client";
import { respondToError } from "@/lib/api-errors";
import { getCurrentCabinet } from "@/lib/current-cabinet";
import { cancelAppointmentOnGoogle, updateAppointmentOnGoogle } from "@/lib/google-calendar";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ appointmentId: string }> };
const statuses = Object.values(AppointmentStatus);

export async function PATCH(request: Request, { params }: Context) {
  try {
    const cabinet = await getCurrentCabinet(); const { appointmentId } = await params;
    const body = await request.json().catch(() => null) as { startsAt?: unknown; endsAt?: unknown; reason?: unknown; status?: unknown } | null;
    const current = await prisma.appointment.findFirst({ where: { id: appointmentId, cabinetId: cabinet.id }, include: { patient: true } });
    if (!current) return Response.json({ error: "Rendez-vous introuvable." }, { status: 404 });
    const startsAt = typeof body?.startsAt === "string" ? new Date(body.startsAt) : current.startsAt;
    const endsAt = typeof body?.endsAt === "string" ? new Date(body.endsAt) : current.endsAt;
    const status = typeof body?.status === "string" ? body.status : current.status;
    const reason = typeof body?.reason === "string" ? body.reason.trim() || null : current.reason;
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || endsAt <= startsAt || !statuses.includes(status as AppointmentStatus)) return Response.json({ error: "Les informations du rendez-vous sont invalides." }, { status: 422 });
    if (status !== AppointmentStatus.CANCELLED) { const conflict = await prisma.appointment.findFirst({ where: { cabinetId: cabinet.id, id: { not: appointmentId }, status: { not: AppointmentStatus.CANCELLED }, startsAt: { lt: endsAt }, endsAt: { gt: startsAt } }, select: { id: true } }); if (conflict) return Response.json({ error: "Ce créneau est déjà occupé." }, { status: 409 }); }
    const appointment = await prisma.appointment.update({ where: { id: current.id }, data: { startsAt, endsAt, reason, status: status as AppointmentStatus }, include: { patient: true } });
    const sync = status === AppointmentStatus.CANCELLED ? await cancelAppointmentOnGoogle(appointment).catch(() => ({ synced: false as const })) : await updateAppointmentOnGoogle(appointment).catch(() => ({ synced: false as const }));
    return Response.json({ appointment, googleSynced: sync.synced });
  } catch (error) { return respondToError("api/cabinet/appointments/[appointmentId]", error); }
}

export async function DELETE(request: Request, context: Context) { return PATCH(new Request(request.url, { method: "PATCH", headers: request.headers, body: JSON.stringify({ status: AppointmentStatus.CANCELLED }) }), context); }
