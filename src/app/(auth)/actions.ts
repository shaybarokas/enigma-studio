"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { trySend } from "@/lib/email/send";
import { appUrl, confirmEmail, passwordChangedEmail, resetEmail } from "@/lib/email/templates";

export type FormState = { error?: string; done?: string } | undefined;

const AUTH_ERRORS: Record<string, string> = {
  "Invalid login credentials": "האימייל או הסיסמה שגויים.",
  "User already registered": "כבר קיים חשבון עם האימייל הזה. אפשר להיכנס.",
  "A user with this email address has already been registered": "כבר קיים חשבון עם האימייל הזה. אפשר להיכנס.",
};
const translate = (msg: string) => {
  if (/^Email address .* is invalid$/.test(msg)) return "כתובת האימייל לא תקינה.";
  if (!AUTH_ERRORS[msg]) console.error("[auth]", msg);
  return AUTH_ERRORS[msg] ?? "משהו השתבש. נסו שוב בעוד רגע.";
};

function safeNext(v: FormDataEntryValue | null) {
  const s = String(v ?? "");
  return s.startsWith("/studio") ? s : "/studio";
}

// A one-time link that confirms the address (new accounts) or, for an account that never confirmed,
// confirms it on click. `welcome` makes /auth/confirm send the welcome email once it succeeds.
async function sendConfirmation(email: string, name: string | null, type: "signup" | "magiclink", password?: string, marketing = false) {
  const admin = createAdminClient();
  const { data, error } =
    type === "signup"
      ? await admin.auth.admin.generateLink({ type: "signup", email, password: password!, options: { data: { full_name: name, marketing } } })
      : await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (error || !data.properties?.hashed_token) return { error };
  const url = appUrl(`/auth/confirm?type=${type}&welcome=1&token_hash=${encodeURIComponent(data.properties.hashed_token)}`);
  const sent = await trySend({ to: email, ...confirmEmail(name ?? ((data.user?.user_metadata?.full_name as string | undefined) || null), url) }, "confirm");
  return { error: sent ? null : new Error("not sent") };
}

export async function signIn(_: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "צריך למלא אימייל וסיסמה." };
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (/not confirmed/i.test(error.message)) {
      await sendConfirmation(email, null, "magiclink");
      return { error: "צריך קודם לאשר את כתובת המייל. שלחנו אליכם עכשיו קישור חדש לאישור." };
    }
    return { error: translate(error.message) };
  }
  // A password alone isn't enough: the address must be confirmed before the account works.
  if (!data.user.email_confirmed_at) {
    await supabase.auth.signOut();
    await sendConfirmation(email, null, "magiclink");
    return { error: "צריך קודם לאשר את כתובת המייל. שלחנו אליכם עכשיו קישור חדש לאישור." };
  }
  redirect(safeNext(formData.get("next")));
}

// The account opens only from the link in the confirmation email, so every free account is a real,
// reachable address (one person can't farm free credits with made-up ones).
export async function signUp(_: FormState, formData: FormData): Promise<FormState> {
  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!fullName || !email) return { error: "צריך למלא שם ואימייל." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "כתובת האימייל לא תקינה." };
  if (password.length < 8) return { error: "הסיסמה צריכה להכיל לפחות 8 תווים." };

  // Marketing email only with an explicit, unticked-by-default opt-in (moved into the account once
  // the address is confirmed, see /auth/confirm).
  const marketing = formData.get("marketing") === "on";
  const { error } = await sendConfirmation(email, fullName, "signup", password, marketing);
  if (error && /already|registered|exists/i.test(error.message)) {
    // Existing address: the same answer as a new one (nobody learns who has an account); its
    // owner gets a link that signs in, or confirms an account that was never confirmed.
    await sendConfirmation(email, fullName, "magiclink");
  } else if (error) {
    return { error: /invalid/i.test(error.message) ? "כתובת האימייל לא תקינה." : "לא הצלחנו לשלוח את מייל האישור. נסו שוב בעוד רגע." };
  }
  return { done: `שלחנו מייל אישור ל־${email}. לוחצים על הכפתור במייל, והחשבון נפתח. לא הגיע? כדאי לבדוק בספאם.` };
}

// The same answer whether or not the address has an account, so the form can't be used to
// find out who signed up. The link carries a one-time token that /auth/confirm verifies.
export async function requestReset(_: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "כתובת האימייל לא תקינה." };
  const { data, error } = await createAdminClient().auth.admin.generateLink({ type: "recovery", email });
  if (!error && data.properties?.hashed_token) {
    const url = appUrl(`/auth/confirm?type=recovery&token_hash=${encodeURIComponent(data.properties.hashed_token)}`);
    await trySend({ to: email, ...resetEmail((data.user?.user_metadata?.full_name as string | undefined) ?? null, url) }, "reset");
  } else if (error && !/not found/i.test(error.message)) console.error("[auth] reset link", error.message);
  return { done: "אם יש חשבון עם האימייל הזה, שלחנו אליו קישור לבחירת סיסמה חדשה. כדאי לבדוק גם בתיקיית הספאם." };
}

export async function setNewPassword(_: FormState, formData: FormData): Promise<FormState> {
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) return { error: "הסיסמה צריכה להכיל לפחות 8 תווים." };
  if (password !== String(formData.get("confirm") ?? "")) return { error: "שתי הסיסמאות לא זהות." };
  const supabase = await createClient();
  const { data, error } = await supabase.auth.updateUser({ password });
  if (error) {
    if (/different from the old/i.test(error.message)) return { error: "זו הסיסמה הנוכחית. בחרו סיסמה אחרת." };
    if (/session/i.test(error.message)) return { error: "הקישור פג. אפשר לבקש קישור חדש." };
    return { error: translate(error.message) };
  }
  // Every other device signs out; this one stays in.
  await supabase.auth.signOut({ scope: "others" });
  if (data.user.email) await trySend({ to: data.user.email, ...passwordChangedEmail((data.user.user_metadata?.full_name as string | undefined) ?? null) }, "password-changed");
  redirect("/studio?password=changed");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
