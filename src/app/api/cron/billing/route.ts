import { NextResponse, type NextRequest } from "next/server";
import { runBillingCron } from "@/lib/billing/service";
import { cronAuthorized } from "@/lib/cron";
import { alertOwner } from "@/lib/alert";

export const maxDuration = 300;

// Daily (vercel.json): renewals and ended plans. Vercel sends Authorization: Bearer $CRON_SECRET.
export async function GET(request: NextRequest) {
  if (!cronAuthorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  let results: Record<string, string>;
  try {
    results = await runBillingCron();
  } catch (e) {
    await alertOwner("billing:cron", "הריצה היומית של החיובים נכשלה", { error: (e as Error).message });
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  console.log("[billing] cron", JSON.stringify(results));
  return NextResponse.json({ ok: true, handled: Object.keys(results).length });
}
