import { getCurrentCabinet } from "@/lib/current-cabinet";
import { prisma } from "@/lib/prisma";
import { respondToError } from "@/lib/api-errors";

type Context = { params: Promise<{ automationId: string }> };

export async function PATCH(request: Request, { params }: Context) {
  const { automationId } = await params;
  const body = await request.json().catch(() => null) as { enabled?: unknown } | null;
  if (typeof body?.enabled !== "boolean") return Response.json({ error: "Statut invalide." }, { status: 422 });
  try {
    const cabinet = await getCurrentCabinet();
    const updated = await prisma.automation.updateMany({ where: { id: automationId, cabinetId: cabinet.id }, data: { enabled: body.enabled } });
    return updated.count ? Response.json({ enabled: body.enabled }) : Response.json({ error: "Introuvable." }, { status: 404 });
  } catch (error) { return respondToError("api/cabinet/automations/[automationId]", error); }
}
