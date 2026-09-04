import { NextResponse } from "next/server";
import { getCurrentCabinet } from "@/lib/current-cabinet";
import { prisma } from "@/lib/prisma";
import { respondToError } from "@/lib/api-errors";

export async function GET() {
  try {
    const cabinet = await getCurrentCabinet();
    const integration = await prisma.integrationAccount.findUnique({ where: { cabinetId_provider: { cabinetId: cabinet.id, provider: "GOOGLE_CALENDAR" } }, select: { selectedCalendarId: true, updatedAt: true } });
    return NextResponse.json({ configured: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.TOKEN_ENCRYPTION_KEY && process.env.APP_URL), connected: Boolean(integration), selectedCalendarId: integration?.selectedCalendarId ?? null, updatedAt: integration?.updatedAt ?? null });
  } catch (error) { return respondToError("api/integrations/google/status", error); }
}
