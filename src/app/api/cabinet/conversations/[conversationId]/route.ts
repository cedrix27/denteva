import { ConversationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentCabinet } from "@/lib/current-cabinet";
import { respondToError } from "@/lib/api-errors";

type Context = { params: Promise<{ conversationId: string }> };
export async function GET(_: Request, { params }: Context) {
  const { conversationId } = await params;
  try { const cabinet = await getCurrentCabinet(); const conversation = await prisma.conversation.findFirst({ where: { id: conversationId, cabinetId: cabinet.id }, include: { patient: true, messages: { orderBy: { createdAt: "asc" } } } }); return conversation ? Response.json({ conversation }) : Response.json({ error: "Introuvable." }, { status: 404 }); } catch (error) { return respondToError("api/cabinet/conversations/[conversationId]", error); }
}
export async function PATCH(request: Request, { params }: Context) {
  const { conversationId } = await params;
  const status = (await request.json().catch(() => null) as { status?: string } | null)?.status;
  if (!Object.values(ConversationStatus).includes(status as ConversationStatus)) return Response.json({ error: "Statut invalide." }, { status: 422 });
  try { const cabinet = await getCurrentCabinet(); const updated = await prisma.conversation.updateMany({ where: { id: conversationId, cabinetId: cabinet.id }, data: { status: status as ConversationStatus } }); return updated.count ? Response.json({ status }) : Response.json({ error: "Introuvable." }, { status: 404 }); } catch (error) { return respondToError("api/cabinet/conversations/[conversationId]", error); }
}
