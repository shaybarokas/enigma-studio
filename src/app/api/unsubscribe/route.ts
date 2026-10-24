import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Unsubscribe from marketing email by the token in every message: the mail client's one-click
// (List-Unsubscribe-Post) and the button on /unsubscribe both POST here. Service email (account,
// billing, a ready video) is not affected.
export async function POST(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("t") ?? "";
  if (/^[0-9a-f-]{36}$/i.test(token)) {
    await createAdminClient().from("accounts").update({ marketing_consent: false }).eq("email_token", token);
  }
  // A mail client's one-click (RFC 8058) sends "List-Unsubscribe=One-Click" and only needs the 200;
  // the button on /unsubscribe comes back to the page.
  const body = await request.text().catch(() => "");
  if (body.includes("List-Unsubscribe=One-Click")) return NextResponse.json({ ok: true });
  return NextResponse.redirect(new URL(`/unsubscribe?t=${token}&done=1`, request.url), 303);
}
