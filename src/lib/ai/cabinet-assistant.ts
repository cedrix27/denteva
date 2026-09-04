import { generateText, stepCountIs, type ModelMessage } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { MessageAuthor } from "@prisma/client";
import { appointmentTools, type BookingContext } from "@/lib/ai/appointment-tools";

type Knowledge = { question: string; answer: string; category: string };
type HistoryEntry = { author: MessageAuthor; body: string };

/** Enough steps for: search availability → answer, or list → cancel → confirm. */
const MAX_STEPS = 5;

/** Earlier turns of the same conversation, oldest first, so the assistant keeps context. */
function toModelMessages(history: HistoryEntry[]): ModelMessage[] {
  return history
    .filter((entry) => entry.author !== MessageAuthor.SYSTEM && entry.body.trim())
    .map((entry) => ({ role: entry.author === MessageAuthor.PATIENT ? "user" : "assistant", content: entry.body }));
}

export async function generateCabinetReply(input: { cabinetName: string; city: string | null; address: string | null; openingHours: unknown; language: string; knowledge: Knowledge[]; history: HistoryEntry[]; message: string; booking?: BookingContext }) {
  if (!process.env.OPENAI_API_KEY) return null;
  const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const language = input.language === "darija" ? "darija marocaine" : input.language === "en" ? "anglais" : "français";
  const knowledge = input.knowledge.map((item) => `- [${item.category}] Q: ${item.question}\n  R: ${item.answer}`).join("\n") || "Aucune réponse validée n’est encore disponible.";
  const timeZone = input.booking?.timeZone ?? "Africa/Casablanca";
  const today = new Intl.DateTimeFormat("fr-FR", { timeZone, dateStyle: "full" }).format(new Date());
  const isoToday = new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date());

  const bookingRules = input.booking
    ? `\n\nPRISE DE RENDEZ-VOUS\nNous sommes le ${today} (${isoToday}), fuseau ${timeZone}. Calcule toujours les dates à partir de cette date.\n- Dès que le patient veut un rendez-vous, appelle chercher_disponibilites et propose au maximum trois créneaux.\n- N'invente jamais un créneau : ne propose que ceux renvoyés par l'outil.\n- N'appelle reserver_creneau qu'après avoir énoncé la date et l'heure exactes et obtenu un accord explicite du patient.\n- Après réservation, confirme en rappelant la date et l'heure, et précise que le cabinet confirmera.\n- Pour modifier un rendez-vous : lister_mes_rendez_vous, puis annuler_rendez_vous, puis reserver_creneau.`
    : "";

  const system = `Tu es l'assistant WhatsApp du cabinet dentaire ${input.cabinetName}, situé à ${input.city ?? "Maroc"}. Réponds exclusivement en ${language}, avec un ton chaleureux, clair et concis. Utilise seulement les informations ci-dessous lorsqu'elles existent. Ne pose pas de diagnostic, ne prescris pas de traitement. Si le patient décrit une urgence (douleur intense, saignement important, traumatisme, gonflement, difficulté à respirer/avaler), invite-le à appeler immédiatement le cabinet ou les urgences locales et marque que la réception doit reprendre. Les horaires déclarés sont ${JSON.stringify(input.openingHours)}. Adresse: ${input.address ?? "à confirmer avec le cabinet"}.${bookingRules}\n\nBase IA validée:\n${knowledge}`;

  const messages: ModelMessage[] = [...toModelMessages(input.history), { role: "user", content: input.message }];
  const result = await generateText({
    model: openai(process.env.OPENAI_MODEL || "gpt-5-mini"),
    system,
    messages,
    maxOutputTokens: 400,
    ...(input.booking ? { tools: appointmentTools(input.booking), stopWhen: stepCountIs(MAX_STEPS) } : {}),
  });
  return result.text.trim() || null;
}
