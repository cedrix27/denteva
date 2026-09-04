import { getCurrentCabinet } from "@/lib/current-cabinet";
import { prisma } from "@/lib/prisma";
import { respondToError } from "@/lib/api-errors";

const allowedLanguages = ["fr", "en", "darija"];
const defaults = { daily: true, urgent: true, summary: false };

export async function GET() {
  try {
    const cabinet = await getCurrentCabinet();
    return Response.json({
      cabinet: {
        name: cabinet.name, practitionerName: cabinet.practitionerName ?? "", phone: cabinet.phone ?? "", address: cabinet.address ?? "", city: cabinet.city ?? "", building: cabinet.building ?? "", floor: cabinet.floor ?? "", mapsUrl: cabinet.mapsUrl ?? "", accessInstructions: cabinet.accessInstructions ?? "", supportedLanguages: cabinet.supportedLanguages,
        openingHours: cabinet.openingHours ?? { weekdays: "09:00 – 18:00", saturday: "Fermé", sunday: "Fermé" },
        slotDurationMinutes: cabinet.slotDurationMinutes,
        notificationSettings: { ...defaults, ...(typeof cabinet.notificationSettings === "object" && cabinet.notificationSettings ? cabinet.notificationSettings : {}) },
      },
    });
  } catch (error) { return respondToError("api/cabinet/settings", error); }
}

export async function PUT(request: Request) {
  try {
    const cabinet = await getCurrentCabinet();
    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    const text = (key: string, max = 255) => typeof body?.[key] === "string" ? body[key].trim().slice(0, max) : undefined;
    const openingHours = body?.openingHours && typeof body.openingHours === "object" ? body.openingHours as Record<string, unknown> : undefined;
    const notificationSettings = body?.notificationSettings && typeof body.notificationSettings === "object" ? body.notificationSettings as Record<string, unknown> : undefined;
    const languages = Array.isArray(body?.supportedLanguages) ? body.supportedLanguages.filter((value): value is string => typeof value === "string" && allowedLanguages.includes(value)).slice(0, 3) : undefined;
    const name = text("name", 100);
    if (name !== undefined && name.length < 2) return Response.json({ error: "Le nom du cabinet doit contenir au moins 2 caractères." }, { status: 422 });
    const mapsUrl = text("mapsUrl", 500);
    if (mapsUrl && !/^https?:\/\//i.test(mapsUrl)) return Response.json({ error: "Le lien Maps doit commencer par https://." }, { status: 422 });
    const cleanHours = openingHours ? { weekdays: typeof openingHours.weekdays === "string" ? openingHours.weekdays.slice(0, 40) : "Fermé", saturday: typeof openingHours.saturday === "string" ? openingHours.saturday.slice(0, 40) : "Fermé", sunday: typeof openingHours.sunday === "string" ? openingHours.sunday.slice(0, 40) : "Fermé" } : undefined;
    const cleanNotifications = notificationSettings ? { daily: Boolean(notificationSettings.daily), urgent: Boolean(notificationSettings.urgent), summary: Boolean(notificationSettings.summary) } : undefined;
    const rawSlot = Number(body?.slotDurationMinutes);
    if (body?.slotDurationMinutes !== undefined && (!Number.isInteger(rawSlot) || rawSlot < 10 || rawSlot > 240)) return Response.json({ error: "La durée d’un rendez-vous doit être comprise entre 10 et 240 minutes." }, { status: 422 });
    const slotDurationMinutes = body?.slotDurationMinutes !== undefined ? rawSlot : undefined;
    const updated = await prisma.cabinet.update({ where: { id: cabinet.id }, data: { name, practitionerName: text("practitionerName", 100), phone: text("phone", 40), address: text("address", 255), city: text("city", 100), building: text("building", 100), floor: text("floor", 50), mapsUrl, accessInstructions: text("accessInstructions", 500), ...(slotDurationMinutes !== undefined ? { slotDurationMinutes } : {}), ...(languages ? { supportedLanguages: languages.length ? languages : ["fr"] } : {}), ...(cleanHours ? { openingHours: cleanHours } : {}), ...(cleanNotifications ? { notificationSettings: cleanNotifications } : {}) } });
    return Response.json({ cabinet: updated });
  } catch (error) { return respondToError("api/cabinet/settings", error); }
}
