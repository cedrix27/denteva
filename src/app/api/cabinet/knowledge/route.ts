import { NextResponse } from "next/server";
import { KnowledgeEntryStatus } from "@prisma/client";
import { getCurrentCabinet } from "@/lib/current-cabinet";
import { prisma } from "@/lib/prisma";
import { respondToError } from "@/lib/api-errors";

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

export async function GET() {
  try {
    const cabinet = await getCurrentCabinet();
    const entries = await prisma.knowledgeBaseEntry.findMany({ where: { cabinetId: cabinet.id }, orderBy: { updatedAt: "desc" } });
    return NextResponse.json({ entries });
  } catch (error) { return respondToError("api/cabinet/knowledge", error); }
}

export async function POST(request: Request) {
  try {
    const entry = validEntry(await request.json());
    if (!entry) return NextResponse.json({ error: "Question and answer are required." }, { status: 400 });
    const cabinet = await getCurrentCabinet();
    const created = await prisma.knowledgeBaseEntry.create({ data: { ...entry, cabinetId: cabinet.id } });
    return NextResponse.json({ entry: created }, { status: 201 });
  } catch (error) { return respondToError("api/cabinet/knowledge", error); }
}
