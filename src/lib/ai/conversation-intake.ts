/** The emergency path is explicit: the assistant never infers it from symptoms. */
export function isEmergencyCommand(message: string) {
  return message.trim().toLocaleLowerCase().replace(/[.!?؟،,؛;]+/g, "").trim() === "urgence";
}

export function languageWelcome(language: string) {
  if (language === "en") return "Thank you. If this is an emergency, type URGENCE. Otherwise, I can help with:\n1. Practice information (address, hours and contact)\n2. Services and treatments listed by the practice\n3. Prices and practical arrangements available in the knowledge base\n4. Booking, changing or cancelling an appointment\nHow can I help you?";
  if (language === "darija") return "شكراً. إلا كانت عندك حالة مستعجلة، كتب URGENCE. إلا ماشي حالة مستعجلة، نقدر نعاونك فـ:\n1. معلومات العيادة (العنوان، أوقات العمل والتواصل)\n2. الخدمات والعلاجات اللي كتوفرها العيادة\n3. الأثمنة والمعلومات الموجودة\n4. أخذ أو تغيير أو إلغاء موعد\nكيفاش نقدر نعاونك؟";
  return "Merci. Si vous avez une urgence, tapez URGENCE. Sinon, je peux vous aider pour :\n1. Les informations du cabinet (adresse, horaires et contact)\n2. Les services et soins proposés par le cabinet\n3. Les tarifs et modalités présents dans les informations du cabinet\n4. La prise, la modification ou l’annulation d’un rendez-vous\nComment puis-je vous aider ?";
}
