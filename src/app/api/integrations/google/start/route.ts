import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { getCurrentCabinet } from "@/lib/current-cabinet";

export const runtime = "nodejs";

export async function GET() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const appUrl = process.env.APP_URL;
  if (!clientId || !process.env.GOOGLE_CLIENT_SECRET || !process.env.TOKEN_ENCRYPTION_KEY || !appUrl) return NextResponse.json({ error: "Google Calendar is not configured yet." }, { status: 503 });
  await getCurrentCabinet();
  const state = randomBytes(24).toString("hex");
  const callbackUrl = `${appUrl}/api/integrations/google/callback`;
  const authorizationUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authorizationUrl.searchParams.set("client_id", clientId);
  authorizationUrl.searchParams.set("redirect_uri", callbackUrl);
  authorizationUrl.searchParams.set("response_type", "code");
  authorizationUrl.searchParams.set("access_type", "offline");
  authorizationUrl.searchParams.set("prompt", "consent");
  authorizationUrl.searchParams.set("state", state);
  authorizationUrl.searchParams.set("scope", "openid email https://www.googleapis.com/auth/calendar.events");
  const response = NextResponse.redirect(authorizationUrl);
  response.cookies.set("denta_google_oauth_state", state, { httpOnly: true, maxAge: 600, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/" });
  return response;
}
