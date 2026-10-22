import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// One-time links from our emails: verifies the token, which signs the user in, then continues.
export async function GET(request: NextRequest) {
  const p = request.nextUrl.searchParams;
  const token_hash = p.get("token_hash");
  const type = p.get("type") as EmailOtpType | null;
  const target = new URL(type === "recovery" ? "/reset" : "/studio", request.nextUrl.origin);
  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) return NextResponse.redirect(target);
    console.error("[auth] confirm", error.message);
  }
  return NextResponse.redirect(new URL("/forgot?expired=1", request.nextUrl.origin));
}
