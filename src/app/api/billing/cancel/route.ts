import { NextResponse } from "next/server";
import { getUserAndClient } from "@/lib/kits";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyCancelled } from "@/lib/billing/service";

// Cancel (or resume) the plan at the end of the paid period. Nothing is charged after that.
export async function POST(req: Request) {
  const { user } = await getUserAndClient();
  if (!user) return NextResponse.json({ error: "צריך להתחבר" }, { status: 401 });
  const { cancel } = (await req.json()) as { cancel: boolean };
  await createAdminClient().from("accounts").update({ cancel_at_period_end: Boolean(cancel) }).eq("user_id", user.id).neq("plan", "free");
  if (cancel) await notifyCancelled(user.id);
  return NextResponse.json({ ok: true });
}
