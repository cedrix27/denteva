import { MessageAuthor } from "@prisma/client";
import { generateCabinetReply } from "@/lib/ai/cabinet-assistant";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

const HISTORY_LIMIT = 12;
const KNOWLEDGE_LIMIT = 24;
const REPLIES_PER_HOUR = Number(process.env.AI_REPLIES_PER_CONVERSATION_PER_HOUR || 20);

export type CabinetContext = { id: string; name: string; city: string | null; address: string | null; openingHours: unknown; timezone: string; slotDurationMinutes: number };

/**
 * Guards against a single number driving unbounded model spend.
 * Counts inbound messages on this conversation over the last rolling hour.
 */
export async function isConversationThrottled(conversationId: string) {
  const recent = await prisma.message.count({ where: { conversationId, author: MessageAuthor.PATIENT, createdAt: { gte: new Date(Date.now() - 3_600_000) } } });
  if (recent <= REPLIES_PER_HOUR) return false;
  logger.warn("assistant.rate_limited", { conversationId, recent, limit: REPLIES_PER_HOUR });
  return true;
}

/** Loads the cabinet's validated knowledge plus the earlier turns, then asks the model. */
export async function generateConversationReply(input: { cabinet: CabinetContext; conversationId: string; inboundMessageId: string; language: string; message: string; patientId?: string }) {
  const context = { cabinetId: input.cabinet.id, conversationId: input.conversationId };
  const startedAt = Date.now();
  try {
    const [knowledge, history] = await Promise.all([
      prisma.knowledgeBaseEntry.findMany({ where: { cabinetId: input.cabinet.id, status: "ACTIVE" }, select: { question: true, answer: true, category: true }, orderBy: [{ updatedAt: "desc" }, { id: "asc" }], take: KNOWLEDGE_LIMIT }),
      prisma.message.findMany({ where: { conversationId: input.conversationId, id: { not: input.inboundMessageId } }, select: { author: true, body: true }, orderBy: { createdAt: "desc" }, take: HISTORY_LIMIT }),
    ]);
    const reply = await generateCabinetReply({
      cabinetName: input.cabinet.name,
      city: input.cabinet.city,
      address: input.cabinet.address,
      openingHours: input.cabinet.openingHours,
      language: input.language,
      knowledge,
      history: history.reverse(),
      message: input.message,
      // Booking tools are only handed over when we know which patient is speaking.
      booking: input.patientId ? {
        cabinetId: input.cabinet.id,
        cabinetName: input.cabinet.name,
        patientId: input.patientId,
        conversationId: input.conversationId,
        openingHours: input.cabinet.openingHours,
        timeZone: input.cabinet.timezone,
        slotDurationMinutes: input.cabinet.slotDurationMinutes,
      } : undefined,
    });
    if (reply.ok) logger.info("assistant.reply_generated", { ...context, durationMs: Date.now() - startedAt });
    else logger.warn("assistant.no_reply", { ...context, durationMs: Date.now() - startedAt, reason: reply.reason, retryable: reply.retryable });
    return reply;
  } catch (error) {
    // Loading knowledge or history failed: a database blip, worth retrying.
    logger.error("assistant.reply_failed", { ...context, durationMs: Date.now() - startedAt, error });
    return { ok: false as const, retryable: true, reason: "CONTEXT_LOAD_FAILED" };
  }
}
