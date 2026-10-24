import { NextResponse, type NextRequest } from "next/server";
import { alertOwner } from "@/lib/alert";
import { cronAuthorized } from "@/lib/cron";
import { deliver } from "@/lib/email/deliver";
import { stepMail, type Step } from "@/lib/email/marketing";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 300;

// Daily (vercel.json): the automatic marketing emails due today (marketing_due() picks at most one
// per user, the most useful step first, and never repeats a step).
export async function GET(request: NextRequest) {
  if (!cronAuthorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data, error } = await createAdminClient().rpc("marketing_due");
  if (error) {
    await alertOwner("cron:emails", "שליחת מיילי הדיוור האוטומטיים נכשלה", { error: error.message });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const due = (data ?? []) as { user_id: string; email: string; name: string | null; token: string; step: Step; plan: string; free_video_used: boolean }[];
  const sent = await deliver(due.map((d) => ({ r: d, kind: `seq:${d.step}`, mail: stepMail(d) })));
  return NextResponse.json({ ok: true, due: due.length, sent });
}
