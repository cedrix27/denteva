import { sendDailySchedules } from "@/lib/cabinet-notifications";
export const runtime = "nodejs";
export async function GET(request: Request) { if (!process.env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return Response.json({ error: "Non autorisé." }, { status: 401 }); return Response.json(await sendDailySchedules()); }
