export type KnowledgeEntry = { question: string; answer: string; category: string };

const MAX_RELEVANT_ENTRIES = 8;
const STOP_WORDS = new Set([
  "a", "ai", "and", "au", "aux", "avec", "ce", "ces", "chez", "comment", "de", "des", "do", "du", "en", "est", "et", "for", "i", "il", "in", "is", "je", "la", "le", "les", "ma", "me", "mon", "my", "of", "on", "or", "ou", "pour", "que", "quel", "quelle", "quelles", "quels", "qui", "s", "so", "sur", "the", "to", "un", "une", "vos", "vous", "what", "where", "with", "your", "هل", "من", "في", "على", "و", "شنو", "كيف", "ديال",
]);

function normalize(value: string) {
  return value.toLocaleLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function tokens(value: string) {
  return [...normalize(value).matchAll(/[\p{L}\p{N}]{2,}/gu)]
    .map(([token]) => token)
    .filter((token) => !STOP_WORDS.has(token));
}

function containsToken(haystack: string[], needle: string) {
  return haystack.some((token) => token === needle || (needle.length >= 5 && token.length >= 5 && (token.startsWith(needle.slice(0, 5)) || needle.startsWith(token.slice(0, 5)))));
}

/**
 * Lexical RAG for the cabinet knowledge base. It intentionally keeps only
 * evidence related to the patient message instead of sending an arbitrary
 * "last updated" slice of the whole base to the model.
 */
export function findRelevantKnowledge(message: string, entries: KnowledgeEntry[], limit = MAX_RELEVANT_ENTRIES) {
  const query = tokens(message);
  if (!query.length) return [];

  return entries
    .map((entry) => {
      const questionTokens = tokens(entry.question);
      const answerTokens = tokens(entry.answer);
      const categoryTokens = tokens(entry.category);
      let score = 0;
      for (const term of query) {
        if (containsToken(questionTokens, term)) score += 8;
        if (containsToken(answerTokens, term)) score += 3;
        if (containsToken(categoryTokens, term)) score += 2;
      }
      // A full question or sentence fragment match is strong evidence.
      const normalizedQuestion = normalize(entry.question);
      const normalizedMessage = normalize(message);
      if (normalizedQuestion.includes(normalizedMessage) || normalizedMessage.includes(normalizedQuestion)) score += 12;
      return { entry, score };
    })
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit)
    .map(({ entry }) => entry);
}
