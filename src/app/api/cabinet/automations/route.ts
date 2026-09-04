import { getCurrentCabinet } from "@/lib/current-cabinet";
import { prisma } from "@/lib/prisma";
import { respondToError } from "@/lib/api-errors";

const defaults = [
  { key: "welcome", title: "Accueil intelligent", description: "Répond instantanément aux nouveaux messages WhatsApp.", trigger: "Nouveau message", color: "violet", enabled: true },
  { key: "reminder", title: "Rappels de rendez-vous", description: "Envoie un rappel 24 h avant chaque consultation.", trigger: "24 h avant le rendez-vous", color: "orange", enabled: true },
  { key: "booking", title: "Confirmation automatique", description: "Confirme le créneau dès qu’un patient répond Oui.", trigger: "Réponse patient positive", color: "green", enabled: true },
  { key: "followup", title: "Suivi après consultation", description: "Prend des nouvelles après une visite au cabinet.", trigger: "48 h après le rendez-vous", color: "blue", enabled: false },
];

export async function GET() {
  try {
    const cabinet = await getCurrentCabinet();
    await prisma.$transaction(defaults.map((item) => prisma.automation.upsert({
      where: { cabinetId_key: { cabinetId: cabinet.id, key: item.key } },
      update: {},
      create: { cabinetId: cabinet.id, key: item.key, enabled: item.enabled, settings: { title: item.title, description: item.description, trigger: item.trigger, color: item.color } },
    })));
    const automations = await prisma.automation.findMany({ where: { cabinetId: cabinet.id }, orderBy: { createdAt: "asc" } });
    return Response.json({ automations });
  } catch (error) { return respondToError("api/cabinet/automations", error); }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { key?: unknown } | null;
  const key = typeof body?.key === "string" ? body.key : "";
  const template = defaults.find((item) => item.key === key);
  if (!template) return Response.json({ error: "Modèle d’automatisation invalide." }, { status: 422 });
  try {
    const cabinet = await getCurrentCabinet();
    const automation = await prisma.automation.upsert({
      where: { cabinetId_key: { cabinetId: cabinet.id, key } }, update: { enabled: true },
      create: { cabinetId: cabinet.id, key, enabled: true, settings: { title: template.title, description: template.description, trigger: template.trigger, color: template.color } },
    });
    return Response.json({ automation }, { status: 201 });
  } catch (error) { return respondToError("api/cabinet/automations", error); }
}
