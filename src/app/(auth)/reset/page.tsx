import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getUserAndClient } from "@/lib/kits";
import { setNewPassword } from "../actions";
import { AuthForm } from "../auth-form";
import { AuthShell } from "../auth-shell";

export const metadata = { title: "סיסמה חדשה | Enigma Studio" };

// Reached from the reset email (after /auth/confirm signed the user in) or from the studio.
async function Form() {
  const { user } = await getUserAndClient();
  if (!user) redirect("/forgot");
  return (
    <AuthForm
      action={setNewPassword}
      submitLabel="שמירת הסיסמה"
      fields={[
        { name: "password", label: "סיסמה חדשה (8 תווים לפחות)", type: "password", autoComplete: "new-password" },
        { name: "confirm", label: "שוב, לאימות", type: "password", autoComplete: "new-password" },
      ]}
    />
  );
}

export default function ResetPage() {
  return (
    <AuthShell
      title="בחירת סיסמה חדשה"
      subtitle="אחרי השמירה, כל המכשירים האחרים יתנתקו מהחשבון."
      footer={
        <Link href="/studio" className="font-bold text-brand">
          חזרה לסטודיו
        </Link>
      }
    >
      <Suspense fallback={<p className="text-muted">רגע…</p>}>
        <Form />
      </Suspense>
    </AuthShell>
  );
}
