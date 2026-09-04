import { AppointmentStatus } from "@prisma/client";
import { getCurrentCabinet } from "@/lib/current-cabinet";
import { prisma } from "@/lib/prisma";
import { respondToError } from "@/lib/api-errors";

type Context = { params: Promise<{ patientId: string }> };

export async function GET(_: Request, { params }: Context) {
  try {
    const cabinet = await getCurrentCabinet();
    const { patientId } = await params;
    const patient = await prisma.patient.findFirst({
      where: { id: patientId, cabinetId: cabinet.id },
      include: {
        appointments: { orderBy: { startsAt: "desc" } },
        conversations: {
          orderBy: { updatedAt: "desc" },
          include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } },
        },
      },
    });
    if (!patient) return Response.json({ error: "Patient introuvable." }, { status: 404 });
    const now = new Date();
    const nextAppointment = patient.appointments.find((item) => item.startsAt >= now && item.status !== AppointmentStatus.CANCELLED) ?? null;
    return Response.json({ patient: { ...patient, nextAppointment } });
  } catch (error) {
    return respondToError("api/cabinet/patients/[patientId]", error);
  }
}
