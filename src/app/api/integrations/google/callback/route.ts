import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { encryptToken } from "@/lib/token-crypto";
import { getCurrentCabinet } from "@/lib/current-cabinet";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type GoogleTokenResponse = { access_token?: string; refresh_token?: string; expires_in?: number; scope?: string; error?: string };

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieStore = await cookies();
  const expectedState = cookieStore.get("denta_google_oauth_state")?.value;
  const appUrl = process.env.APP_URL;
  if (!code || !state || !expectedState || state !== expectedState || !appUrl) return NextResponse.redirect(new URL("/cabinet/settings?google=error", request.url));

  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ code, client_id: process.env.GOOGLE_CLIENT_ID ?? "", client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "", redirect_uri: `${appUrl}/api/integrations/google/callback`, grant_type: "authorization_code" }) });
    const tokens = await tokenResponse.json() as GoogleTokenResponse;
    if (!tokenResponse.ok || !tokens.access_token) throw new Error(tokens.error || "Google token exchange failed.");
    const cabinet = await getCurrentCabinet();
    await prisma.integrationAccount.upsert({ where: { cabinetId_provider: { cabinetId: cabinet.id, provider: "GOOGLE_CALENDAR" } }, update: { encryptedAccessToken: encryptToken(tokens.access_token), encryptedRefreshToken: tokens.refresh_token ? encryptToken(tokens.refresh_token) : undefined, expiresAt: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : undefined, selectedCalendarId: "primary", metadata: { scope: tokens.scope ?? "", calendarId: "primary" } }, create: { cabinetId: cabinet.id, provider: "GOOGLE_CALENDAR", encryptedAccessToken: encryptToken(tokens.access_token), encryptedRefreshToken: tokens.refresh_token ? encryptToken(tokens.refresh_token) : null, expiresAt: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null, selectedCalendarId: "primary", metadata: { scope: tokens.scope ?? "", calendarId: "primary" } } });
    const response = NextResponse.redirect(new URL("/cabinet/settings?google=connected", request.url));
    response.cookies.delete("denta_google_oauth_state");
    return response;
  } catch (error) {
    logger.error("google.oauth_callback_failed", { error });
    return NextResponse.redirect(new URL("/cabinet/settings?google=error", request.url));
  }
}
