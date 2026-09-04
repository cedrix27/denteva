import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  let database: "ok" | "error" = "ok";
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    database = "error";
  }

  const healthy = database === "ok";
  return NextResponse.json(
    {
      status: healthy ? "ok" : "degraded",
      service: "denta-assistant",
      timestamp: new Date().toISOString(),
      checks: {
        database,
        twilio: Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
        googleCalendar: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
        ai: Boolean(process.env.OPENAI_API_KEY),
        email: Boolean(process.env.RESEND_API_KEY),
        cron: Boolean(process.env.CRON_SECRET),
      },
    },
    { status: healthy ? 200 : 503 },
  );
}
