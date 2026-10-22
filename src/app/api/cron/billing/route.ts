import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { runBillingCron } from "@/lib/billing/service";

export const maxDuration = 300;

// Daily (vercel.json): renewals and ended plans. Vercel sends Authorization: Bearer $CRON_SECRET.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const given = request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  if (!secret || given.length !== secret.length || !timingSafeEqual(Buffer.from(given), Buffer.from(secret))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const results = await runBillingCron();
  console.log("[billing] cron", JSON.stringify(results));
  return NextResponse.json({ ok: true, handled: Object.keys(results).length });
}
