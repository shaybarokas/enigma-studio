import { NextResponse } from "next/server";
import { getUserAndClient } from "@/lib/kits";
import { createAdminClient } from "@/lib/supabase/admin";

const MESSAGES: Record<string, string> = {
  missing: "הערכה לא נמצאה",
  already: "הערכה הזו כבר פתוחה",
  no_pass: "אין ערכה במתנה לממש. אפשר להזין קוד בעמוד המסלולים.",
};

// Spends a gift kit pass on this kit: every paid feature for it (the pass's credits were added
// when its code was redeemed).
export async function POST(_req: Request, ctx: RouteContext<"/api/kits/[id]/unlock">) {
  const { id } = await ctx.params;
  const { user } = await getUserAndClient();
  if (!user) return NextResponse.json({ error: "צריך להתחבר" }, { status: 401 });
  const { data: r } = await createAdminClient().rpc("unlock_kit", { p_user: user.id, p_kit: id });
  if (r !== "ok") return NextResponse.json({ error: MESSAGES[r as string] ?? "משהו השתבש" }, { status: 400 });
  return NextResponse.json({ ok: true });
}
