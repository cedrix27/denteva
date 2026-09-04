import { PlatformRole } from "@prisma/client";
import { getCurrentUserRecord } from "@/lib/current-cabinet";
import { getTwilioWhatsAppSenders } from "@/lib/twilio-whatsapp";

export async function GET() {
  const user = await getCurrentUserRecord();
  if (user?.platformRole !== PlatformRole.PLATFORM_ADMIN) return Response.json({ error: "Accès refusé." }, { status: 403 });
  const senders = await getTwilioWhatsAppSenders();
  if (!senders) return Response.json({ error: "Twilio est indisponible ou ses identifiants ne sont pas configurés." }, { status: 503 });
  return Response.json({ senders });
}
