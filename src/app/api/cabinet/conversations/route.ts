import { prisma } from "@/lib/prisma";
import { getCurrentCabinet } from "@/lib/current-cabinet";
import { respondToError } from "@/lib/api-errors";

export async function GET() {
  try {
    const cabinet = await getCurrentCabinet();
    const conversations = await prisma.conversation.findMany({
      where: { cabinetId: cabinet.id }, orderBy: { updatedAt: "desc" },
      include: { patient: true, messages: { orderBy: { createdAt: "desc" }, take: 1 } },
    });
    return Response.json({ conversations });
  } catch (error) { return respondToError("api/cabinet/conversations", error); }
}
