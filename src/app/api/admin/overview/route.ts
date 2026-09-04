import { PlatformRole } from "@prisma/client";
import { getCurrentUserRecord } from "@/lib/current-cabinet";
import { prisma } from "@/lib/prisma";
import { respondToError } from "@/lib/api-errors";

export async function GET() {
  try {
    const user = await getCurrentUserRecord();
    if (user?.platformRole !== PlatformRole.PLATFORM_ADMIN) return Response.json({ error: "Accès refusé." }, { status: 403 });
    const [cabinetCount, conversations, connected, pendingCabinets, cabinets] = await Promise.all([
      prisma.cabinet.count(),
      prisma.conversation.count(),
      prisma.integrationAccount.count({ where: { provider: { in: ["WHATSAPP_BUSINESS", "TWILIO_WHATSAPP"] }, externalPhoneNumberId: { not: null } } }),
      prisma.cabinet.findMany({ where: { integrations: { none: { provider: { in: ["WHATSAPP_BUSINESS", "TWILIO_WHATSAPP"] }, externalPhoneNumberId: { not: null } } } }, select: { id: true } }),
      prisma.cabinet.findMany({ take: 3, orderBy: { createdAt: "desc" }, include: { members: { where: { role: "OWNER" }, include: { user: true }, take: 1 }, conversations: { select: { id: true } } } }),
    ]);
    return Response.json({ cabinetCount, conversations, connected, pendingCount: pendingCabinets.length, cabinets: cabinets.map((cabinet) => ({ id: cabinet.id, name: cabinet.name, city: cabinet.city ?? "—", owner: cabinet.members[0]?.user.name ?? cabinet.members[0]?.user.email ?? "—", conversations: cabinet.conversations.length, status: pendingCabinets.some((item) => item.id === cabinet.id) ? "Onboarding" : "Actif" })) });
  } catch (error) { return respondToError("api/admin/overview", error); }
}
