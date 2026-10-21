"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type FormState = { error?: string } | undefined;

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

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: translate(error.message) };
  redirect("/studio");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
