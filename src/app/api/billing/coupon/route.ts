import { NextResponse } from "next/server";
import { applyCode } from "@/lib/coupons";
import { getUserAndClient } from "@/lib/kits";

// A code typed on the plans page.
export async function POST(req: Request) {
  const { user } = await getUserAndClient();
  if (!user) return NextResponse.json({ error: "צריך להתחבר" }, { status: 401 });
  const { code } = (await req.json()) as { code?: string };
  if (!code?.trim()) return NextResponse.json({ error: "צריך להקליד קוד" }, { status: 400 });
  const r = await applyCode(code, user.id);
  return r.ok ? NextResponse.json(r) : NextResponse.json({ error: r.error }, { status: 400 });
}
