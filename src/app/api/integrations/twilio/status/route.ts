import { IntegrationProvider } from "@prisma/client";
import { NextResponse } from "next/server";
import { getCurrentCabinet } from "@/lib/current-cabinet";
import { prisma } from "@/lib/prisma";
import { twilioIsConfigured } from "@/lib/twilio-whatsapp";
import { respondToError } from "@/lib/api-errors";

export async function GET() {
  try {
    const cabinet = await getCurrentCabinet();
    const integration = await prisma.integrationAccount.findUnique({ where: { cabinetId_provider: { cabinetId: cabinet.id, provider: IntegrationProvider.TWILIO_WHATSAPP } }, select: { displayPhoneNumber: true, updatedAt: true } });
    return NextResponse.json({ configured: twilioIsConfigured(), connected: Boolean(integration), phoneNumber: integration?.displayPhoneNumber ?? null, updatedAt: integration?.updatedAt ?? null });
  } catch (error) { return respondToError("api/integrations/twilio/status", error); }
}
