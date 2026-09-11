/**
 * A cheap, deterministic first barrier for requests that plainly have nothing
 * to do with a dental practice. The model still has the final, stricter scope
 * instruction for ambiguous requests; this guard makes common jailbreak/code
 * requests impossible to send to the provider at all.
 */
const OUT_OF_SCOPE_PATTERNS = [
  /\b(?:ecris|écris|genere|génère|write|generate|donne|give)\b.{0,80}\b(?:code|script|programme|program|python|javascript|typescript|html|css|sql|api)\b/i,
  /\b(?:code|script)\b.{0,40}\b(?:python|javascript|typescript|html|css|sql)\b/i,
  /\b(?:recette|recipe|météo|meteo|weather|football|match|bourse|crypto|bitcoin|politique|politics|poème|poeme|poetry|tradu(?:is|ction)|translate)\b/i,
  /\b(?:ignore|oublie|forget|disregard)\b.{0,80}\b(?:instruction|consigne|prompt|system)\b/i,
];

export function isClearlyOutsideCabinetScope(message: string) {
  return OUT_OF_SCOPE_PATTERNS.some((pattern) => pattern.test(message));
}

export function outsideCabinetScopeReply(language: string) {
  if (language === "en") return "I can only help with this dental practice: its services, practical information, and appointments. How can I help you with the practice?";
  if (language === "darija") return "نقدر نعاونك غير فالمعلومات ديال هاد العيادة، الخدمات والمواعيد. كيفاش نقدر نعاونك بخصوص العيادة؟";
  return "Je peux uniquement vous aider pour ce cabinet dentaire : ses informations, ses services et les rendez-vous. Comment puis-je vous aider concernant le cabinet ?";
}
