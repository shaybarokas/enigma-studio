import { NextResponse, type NextRequest } from "next/server";
import { settlePending } from "@/lib/billing/service";
import { cronAuthorized } from "@/lib/cron";
import { alertOwner } from "@/lib/alert";

export const maxDuration = 120;

// Every 10 minutes (vercel.json): confirms paid orders the customer never returned from.
export async function GET(request: NextRequest) {
  if (!cronAuthorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const results = await settlePending();
  const paid = Object.values(results).filter((r) => r === "paid").length;
  // A late payment means PayPlus's callback didn't arrive: worth knowing if it keeps happening.
  if (paid) await alertOwner("billing:late", "תשלומים שאושרו רק בבדיקה המתוזמנת (ה-callback של PayPlus לא הגיע)", { count: paid });
  return NextResponse.json({ ok: true, checked: Object.keys(results).length, paid });
}
