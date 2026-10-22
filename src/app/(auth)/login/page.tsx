import Link from "next/link";
import { Suspense } from "react";
import { signIn } from "../actions";
import { AuthForm } from "../auth-form";
import { AuthShell } from "../auth-shell";

export const metadata = { title: "כניסה | Enigma Studio" };

async function LoginForm({ searchParams }: { searchParams: PageProps<"/login">["searchParams"] }) {
  const { next } = await searchParams;
  return (
    <AuthForm
      action={signIn}
      submitLabel="כניסה"
      next={typeof next === "string" ? next : undefined}
      fields={[
        { name: "email", label: "אימייל", type: "email", autoComplete: "email" },
        { name: "password", label: "סיסמה", type: "password", autoComplete: "current-password" },
      ]}
    />
  );
}

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <AuthShell
      title="ברוכים השבים"
      subtitle="נכנסים וממשיכים לעבוד על הערכות שלכם."
      footer={
        <>
          <Link href="/forgot" className="mb-3 block font-semibold text-muted hover:text-brand">
            שכחתי סיסמה
          </Link>
          אין לך חשבון?{" "}
          <Link href="/signup" className="font-bold text-brand">
            הרשמה בחינם
          </Link>
        </>
      }
    >
      <Suspense>
        <LoginForm searchParams={searchParams} />
      </Suspense>
    </AuthShell>
  );
}
