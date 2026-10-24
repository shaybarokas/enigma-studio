import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { trySend } from "@/lib/email/send";
import { welcomeEmail } from "@/lib/email/templates";

// One-time links from our emails: verifies the token, which signs the user in, then continues.
export async function GET(request: NextRequest) {
  const p = request.nextUrl.searchParams;
  const token_hash = p.get("token_hash");
  const type = p.get("type") as EmailOtpType | null;
  const target = new URL(type === "recovery" ? "/reset" : "/studio", request.nextUrl.origin);
  if (token_hash && type) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      // First confirmation of a new account: the welcome email, and into the studio.
      if (p.get("welcome") === "1" && data.user?.email) {
        // The marketing opt-in ticked at signup, now that the address is confirmed.
        if (data.user.user_metadata?.marketing === true)
          await createAdminClient().from("accounts").update({ marketing_consent: true, marketing_consent_at: new Date().toISOString() }).eq("user_id", data.user.id);
        await trySend({ to: data.user.email, ...welcomeEmail((data.user.user_metadata?.full_name as string | undefined) || null) }, "welcome");
      }
      return NextResponse.redirect(target);
    }
    console.error("[auth] confirm", error.message);
  }
  // An expired account link leads to the login (which re-sends one); a reset link to a new reset.
  return NextResponse.redirect(new URL(type === "recovery" ? "/forgot?expired=1" : "/login?expired=1", request.nextUrl.origin));
}
