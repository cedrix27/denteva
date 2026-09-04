import { AppointmentStatus, Prisma } from "@prisma/client";
import { getCurrentCabinet } from "@/lib/current-cabinet";
import { prisma } from "@/lib/prisma";
import { respondToError } from "@/lib/api-errors";

function cleanPhone(value: unknown) {
  return typeof value === "string" ? value.trim().replace(/[\s().-]/g, "") : "";
}

export async function GET(request: Request) {
  try {
    const cabinet = await getCurrentCabinet();
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim() ?? "";
    const followUp = searchParams.get("filter") === "follow-up";
    const where: Prisma.PatientWhereInput = {
      cabinetId: cabinet.id,
      ...(query ? {
        OR: [
          { displayName: { contains: query, mode: "insensitive" } },
          { phone: { contains: query, mode: "insensitive" } },
        ],
      } : {}),
    };

    const patients = await prisma.patient.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      include: {
        appointments: { orderBy: { startsAt: "desc" } },
        conversations: { select: { updatedAt: true }, orderBy: { updatedAt: "desc" }, take: 1 },
      },
    });
    const now = new Date();
    const serialized = patients.map((patient) => {
      const nextAppointment = patient.appointments.find((item) => item.startsAt >= now && item.status !== AppointmentStatus.CANCELLED) ?? null;
      const lastAppointment = patient.appointments.find((item) => item.startsAt < now && item.status !== AppointmentStatus.CANCELLED) ?? null;
      return {
        id: patient.id,
        displayName: patient.displayName,
        phone: patient.phone,
        preferredLang: patient.preferredLang,
        createdAt: patient.createdAt,
        updatedAt: patient.updatedAt,
        lastInteractionAt: patient.conversations[0]?.updatedAt ?? null,
        lastAppointment: lastAppointment ? { startsAt: lastAppointment.startsAt, status: lastAppointment.status } : null,
        nextAppointment: nextAppointment ? { id: nextAppointment.id, startsAt: nextAppointment.startsAt, status: nextAppointment.status, reason: nextAppointment.reason } : null,
      };
    });
    return Response.json({ patients: followUp ? serialized.filter((patient) => !patient.nextAppointment) : serialized, total: serialized.length });
  } catch (error) {
    return respondToError("api/cabinet/patients", error);
  }
}

export async function POST(request: Request) {
  try {
    const cabinet = await getCurrentCabinet();
    const body = await request.json().catch(() => null) as { displayName?: unknown; phone?: unknown; preferredLang?: unknown } | null;
    const displayName = typeof body?.displayName === "string" ? body.displayName.trim() : "";
    const phone = cleanPhone(body?.phone);
    const preferredLang = typeof body?.preferredLang === "string" ? body.preferredLang.trim().toLowerCase() : "fr";
    if (displayName.length < 2 || !/^\+\d{8,15}$/.test(phone)) {
      return Response.json({ error: "Indiquez le nom et un numéro international valide." }, { status: 422 });
    }
    if (!["fr", "en", "darija"].includes(preferredLang)) {
      return Response.json({ error: "La langue sélectionnée n’est pas prise en charge." }, { status: 422 });
    }
    const patient = await prisma.patient.upsert({
      where: { cabinetId_phone: { cabinetId: cabinet.id, phone } },
      update: { displayName, preferredLang },
      create: { cabinetId: cabinet.id, displayName, phone, preferredLang },
    });
    return Response.json({ patient }, { status: 201 });
  } catch (error) {
    return respondToError("api/cabinet/patients", error);
  }
}
