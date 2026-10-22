"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { trySend } from "@/lib/email/send";
import { appUrl, passwordChangedEmail, resetEmail, welcomeEmail } from "@/lib/email/templates";

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

export async function signIn(_: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "צריך למלא אימייל וסיסמה." };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: translate(error.message) };
  redirect(safeNext(formData.get("next")));
}

// Until the studio's own mail domain is set up, accounts are created confirmed (beta).
export async function signUp(_: FormState, formData: FormData): Promise<FormState> {
  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!fullName || !email) return { error: "צריך למלא שם ואימייל." };
  if (password.length < 8) return { error: "הסיסמה צריכה להכיל לפחות 8 תווים." };

  const admin = createAdminClient();
  const { error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (createError) return { error: translate(createError.message) };

  await trySend({ to: email, ...welcomeEmail(fullName) }, "welcome");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: translate(error.message) };
  redirect("/studio");
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
