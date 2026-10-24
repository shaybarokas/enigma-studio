import { NextResponse } from "next/server";
import { balance, getAccount } from "@/lib/credits";
import { getUserAndClient } from "@/lib/kits";
import { createAdminClient } from "@/lib/supabase/admin";

// The plan and credit balance, for the studio header and upgrade prompts.
export async function GET() {
  const { user } = await getUserAndClient();
  if (!user) return NextResponse.json({ error: "צריך להתחבר" }, { status: 401 });
  const a = await getAccount(user.id);
  return NextResponse.json({ plan: a.plan, credits: balance(a), freeVideoUsed: a.free_video_used, kitPasses: a.kit_passes });
}

// The user's own settings: marketing email on or off.
export async function PATCH(req: Request) {
  const { user } = await getUserAndClient();
  if (!user) return NextResponse.json({ error: "צריך להתחבר" }, { status: 401 });
  const { marketing } = (await req.json().catch(() => ({}))) as { marketing?: unknown };
  if (typeof marketing !== "boolean") return NextResponse.json({ error: "בקשה לא תקינה" }, { status: 400 });
  const { error } = await createAdminClient()
    .from("accounts")
    .update({ marketing_consent: marketing, ...(marketing ? { marketing_consent_at: new Date().toISOString() } : {}) })
    .eq("user_id", user.id);
  if (error) return NextResponse.json({ error: "השמירה נכשלה" }, { status: 500 });
  return NextResponse.json({ marketing });
}
