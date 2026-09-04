import { NextResponse } from "next/server";
import { getCurrentCabinet } from "@/lib/current-cabinet";
import { prisma } from "@/lib/prisma";
import { respondToError } from "@/lib/api-errors";

export async function GET() {
  try {
    const cabinet = await getCurrentCabinet();
    const integration = await prisma.integrationAccount.findUnique({ where: { cabinetId_provider: { cabinetId: cabinet.id, provider: "WHATSAPP_BUSINESS" } }, select: { displayPhoneNumber: true, externalPhoneNumberId: true, updatedAt: true } });
    return NextResponse.json({ configured: Boolean(process.env.META_APP_ID && process.env.META_APP_SECRET && process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN), connected: Boolean(integration), phoneNumber: integration?.displayPhoneNumber ?? null, updatedAt: integration?.updatedAt ?? null });
  } catch (error) { return respondToError("api/integrations/whatsapp/status", error); }
}
