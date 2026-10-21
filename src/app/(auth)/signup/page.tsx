import Link from "next/link";
import { signUp } from "../actions";
import { AuthForm } from "../auth-form";
import { AuthShell } from "../auth-shell";

export const metadata = { title: "הרשמה | Enigma Studio" };

export default function SignupPage() {
  return (
    <AuthShell
      title="יוצרים את ערכת ההשקה הראשונה"
      subtitle="כמה דקות של שיחה עם הסוכן, וגרפיקות וסרטונים מוכנים."
      footer={
        <>
          כבר יש לך חשבון?{" "}
          <Link href="/login" className="font-bold text-brand">
            כניסה
          </Link>
        </>
      }
    >
      <AuthForm
        action={signUp}
        submitLabel="הרשמה והתחלה"
        fields={[
          { name: "full_name", label: "שם מלא", type: "text", autoComplete: "name" },
          { name: "email", label: "אימייל", type: "email", autoComplete: "email" },
          { name: "password", label: "סיסמה (8 תווים לפחות)", type: "password", autoComplete: "new-password" },
        ]}
      />
    </AuthShell>
  );
}
