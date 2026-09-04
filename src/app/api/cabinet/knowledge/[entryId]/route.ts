import { NextResponse } from "next/server";
import { KnowledgeEntryStatus } from "@prisma/client";
import { getCurrentCabinet } from "@/lib/current-cabinet";
import { prisma } from "@/lib/prisma";
import { respondToError } from "@/lib/api-errors";

type RouteContext = { params: Promise<{ entryId: string }> };

function validEntry(input: unknown) {
  if (!input || typeof input !== "object") return null;
  const values = input as Record<string, unknown>;
  const question = typeof values.question === "string" ? values.question.trim() : "";
  const answer = typeof values.answer === "string" ? values.answer.trim() : "";
  const category = typeof values.category === "string" ? values.category.trim() : "Général";
  const status = values.status === "DRAFT" ? KnowledgeEntryStatus.DRAFT : KnowledgeEntryStatus.ACTIVE;
  if (!question || !answer || question.length > 500 || answer.length > 5000 || category.length > 80) return null;
  return { question, answer, category: category || "Général", status };
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const { entryId } = await params;
  try {
    const entry = validEntry(await request.json());
    if (!entry) return NextResponse.json({ error: "Question and answer are required." }, { status: 400 });
    const cabinet = await getCurrentCabinet();
    const updated = await prisma.knowledgeBaseEntry.updateMany({ where: { id: entryId, cabinetId: cabinet.id }, data: entry });
    if (!updated.count) return NextResponse.json({ error: "Entry not found." }, { status: 404 });
    const result = await prisma.knowledgeBaseEntry.findUniqueOrThrow({ where: { id: entryId } });
    return NextResponse.json({ entry: result });
  } catch (error) { return respondToError("api/cabinet/knowledge/[entryId]", error); }
}

export async function DELETE(_: Request, { params }: RouteContext) {
  const { entryId } = await params;
  try {
    const cabinet = await getCurrentCabinet();
    const deleted = await prisma.knowledgeBaseEntry.deleteMany({ where: { id: entryId, cabinetId: cabinet.id } });
    if (!deleted.count) return NextResponse.json({ error: "Entry not found." }, { status: 404 });
    return new NextResponse(null, { status: 204 });
  } catch (error) { return respondToError("api/cabinet/knowledge/[entryId]", error); }
}
