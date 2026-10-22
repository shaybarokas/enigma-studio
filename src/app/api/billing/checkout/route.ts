import { NextResponse } from "next/server";
import { checkout, type Purchase } from "@/lib/billing/service";
import { payplusConfigured } from "@/lib/billing/payplus";
import { getUserAndClient } from "@/lib/kits";

// Opens a PayPlus payment page for a plan or a credit pack.
export async function POST(req: Request) {
  const { user } = await getUserAndClient();
  if (!user?.email) return NextResponse.json({ error: "צריך להתחבר" }, { status: 401 });
  if (!payplusConfigured()) return NextResponse.json({ error: "התשלומים עוד לא פתוחים. נחזור אליכם ממש בקרוב." }, { status: 503 });
  const p = (await req.json()) as Purchase;
  const name = (user.user_metadata?.full_name as string | undefined) || user.email;
  const res = await checkout({ id: user.id, email: user.email, name }, p, new URL(req.url).origin);
  return res.ok ? NextResponse.json({ link: res.link }) : NextResponse.json({ error: res.error }, { status: 400 });
}
