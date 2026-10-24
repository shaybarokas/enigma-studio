import Link from "next/link";
import { Suspense } from "react";

export const metadata = { title: "הסרה מרשימת התפוצה | Enigma Studio", robots: { index: false } };

// The unsubscribe link in every marketing email lands here: one button removes the address (a button
// rather than the visit itself, so link scanners in mail systems can't unsubscribe anyone).
export default function UnsubscribePage({ searchParams }: PageProps<"/unsubscribe">) {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-5 px-4 py-24 text-center">
      <Suspense fallback={null}>
        <Body searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Body({ searchParams }: { searchParams: PageProps<"/unsubscribe">["searchParams"] }) {
  const { t, done } = await searchParams;
  const token = typeof t === "string" && /^[0-9a-f-]{36}$/i.test(t) ? t : null;
  if (done) {
    return (
      <>
        <h1 className="text-3xl font-black">הוסרת מרשימת התפוצה</h1>
        <p className="text-lg text-muted">לא נשלח אליך עוד דיוור שיווקי. הודעות על החשבון עצמו (תשלומים, סרטון שמוכן, סיסמה) ימשיכו להגיע.</p>
        <p className="text-sm text-muted">התחרטת? אפשר להצטרף שוב מעמוד &quot;מסלולים וקרדיטים&quot; בסטודיו.</p>
        <Link href="/" className="rounded-full border border-white/20 px-5 py-2.5 font-bold hover:bg-white/10">
          לעמוד הבית
        </Link>
      </>
    );
  }
  if (!token) {
    return (
      <>
        <h1 className="text-3xl font-black">הקישור לא תקין</h1>
        <p className="text-lg text-muted">אפשר להפסיק את הדיוור מעמוד &quot;מסלולים וקרדיטים&quot; בסטודיו, או לכתוב לנו ונסיר אותך.</p>
      </>
    );
  }
  return (
    <>
      <h1 className="text-3xl font-black">הסרה מרשימת התפוצה</h1>
      <p className="text-lg text-muted">לא לקבל יותר טיפים, עדכונים ומבצעים מ־Enigma Studio במייל?</p>
      <form method="post" action={`/api/unsubscribe?t=${token}`}>
        <button className="rounded-full bg-brand px-7 py-3 text-lg font-bold text-white transition hover:bg-brand-strong">כן, להסיר אותי</button>
      </form>
      <p className="text-sm text-muted">הודעות על החשבון עצמו (תשלומים, סרטון שמוכן, סיסמה) ימשיכו להגיע.</p>
    </>
  );
}
