import { NextResponse } from "next/server";
import { balance, getAccount } from "@/lib/credits";
import { getUserAndClient } from "@/lib/kits";

// The plan and credit balance, for the studio header and upgrade prompts.
export async function GET() {
  const { user } = await getUserAndClient();
  if (!user) return NextResponse.json({ error: "צריך להתחבר" }, { status: 401 });
  const a = await getAccount(user.id);
  return NextResponse.json({ plan: a.plan, credits: balance(a), freeVideoUsed: a.free_video_used, kitPasses: a.kit_passes });
}
