import Link from "next/link";
import { Suspense } from "react";
import { requestReset } from "../actions";
import { AuthForm } from "../auth-form";
import { AuthShell } from "../auth-shell";

export const metadata = { title: "שכחתי סיסמה | Enigma Studio" };

async function Expired({ searchParams }: { searchParams: PageProps<"/forgot">["searchParams"] }) {
  const { expired } = await searchParams;
  return expired ? <p className="mb-4 rounded-xl bg-danger/10 p-3 text-sm text-danger">הקישור פג או שכבר השתמשו בו. אפשר לבקש קישור חדש.</p> : null;
}

export default function ForgotPage({ searchParams }: PageProps<"/forgot">) {
  return (
    <AuthShell
      title="שכחת סיסמה?"
      subtitle="כתבו את האימייל שאיתו נרשמתם, ונשלח קישור לבחירת סיסמה חדשה."
      footer={
        <Link href="/login" className="font-bold text-brand">
          חזרה לכניסה
        </Link>
      }
    >
      <Suspense>
        <Expired searchParams={searchParams} />
      </Suspense>
      <AuthForm action={requestReset} submitLabel="שליחת קישור" fields={[{ name: "email", label: "אימייל", type: "email", autoComplete: "email" }]} />
    </AuthShell>
  );
}
