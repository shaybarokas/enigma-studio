import { TutorialVideo } from "@/components/tutorial-video";
import { TUTORIAL } from "@/lib/tutorial";
import Link from "next/link";
import { COST } from "@/lib/plans";
import { Examples, PhoneVideo } from "./examples";
import { Pricing } from "./pricing";
import { SHOWCASE } from "./showcase";

export const metadata = {
  title: "Enigma Studio | ערכת השקה שלמה בשיחה אחת עם סוכן AI",
  description: "מספרים לסוכן מה משיקים, ומקבלים גרפיקות, מודעות וסרטוני פרומו עם קריינות ישראלית. בקו עיצובי אחד, בכל הגדלים, ובשליטה מלאה שלכם.",
};

const STEPS = [
  {
    n: "1",
    title: "מספרים לסוכן",
    text: "כותבים חופשי על מה שאתם משיקים, או מדביקים קישור לדף המכירה. הסוכן קורא, שואל רק את מה שחסר, ומבין את הקהל, הכאב וההבטחה.",
  },
  {
    n: "2",
    title: "בוחרים כיוון",
    text: "תוך כשתי דקות מקבלים שלושה כיוונים עיצוביים שונים לגמרי, עם רקעים ואביזרים תלת־ממדיים שנוצרים במיוחד בשבילכם.",
  },
  {
    n: "3",
    title: "מקבלים ערכה שלמה",
    text: "גרפיקת תצוגה ומודעות בארבעה גדלים, וסרטוני פרומו ושיווק עם קריינות, כתוביות ומוזיקה. הכול באותו קו עיצובי.",
  },
];

const FEATURES = [
  { icon: "✦", title: "סוכן שמבין שיווק", text: "שואל כמו קופירייטר: מי הקהל, מה כואב לו, מה ההבטחה. וכותב כותרות, הוקים והנעה לפעולה בעברית טבעית." },
  { icon: "◐", title: "כל הגדלים, עיצוב אמיתי", text: "כל גודל מעוצב מחדש, לא חיתוך: 16:9 לעמוד ולמצגת, 1:1 לפיד, 3:4 לפוסט ו־9:16 לסטורי." },
  { icon: "▶", title: "סרטונים עם קול ישראלי", text: "פרומו כמו טריילר וסרטוני שיווק בנוסח הוק, כאב, פתרון והנעה לפעולה. קריינות בעברית, כתוביות קינטיות ומוזיקה מקורית, ואפשר לשלב רגעים אמיתיים מהשיעורים שלכם." },
  { icon: "✎", title: "שליטה מלאה", text: "גוררים, מגדילים ומסובבים כל אלמנט, מחליפים טקסטים, צבעים וגופנים. גם בסרטונים: מתקנים מילה, צבע או הדגשה בעורך. או פשוט כותבים לסוכן מה לשנות." },
  { icon: "◇", title: "תמונה שלכם, תאורה של סטודיו", text: "מעלים תמונה רגילה. הרקע מוסר, והדמות משתלבת בסצנה עם תאורה, צל ועומק, כמו בצילום מקצועי." },
  { icon: "⬇", title: "הורדה בלחיצה", text: "כל קובץ בגודל מלא, או כל הערכה בקובץ אחד. מוכן לאתר, לקמפיין ולרשתות." },
];

const FOR_WHO = ["קורסים דיגיטליים", "סדנאות והרצאות", "נותני שירות", "מוצרים וחנויות", "אירועים והשקות", "סוכנויות ומשווקים"];

const FAQ: [string, string][] = [
  ["צריך לדעת לעצב?", "לא. הסוכן בונה את הכיוונים והערכה. מי שרוצה לדייק, יכול לשנות כל פרט בעורך או פשוט לכתוב לסוכן מה לשנות."],
  ["מה ההבדל בין זה לבין תבניות רגילות?", "תבנית רגילה היא שלד שממלאים. כאן כל ערכה נבנית סביב העסק שלכם: הסוכן כותב את הטקסטים, בוחר שפה עיצובית, ומייצר רקעים ואביזרים שלא קיימים בשום מקום אחר."],
  ["מה עם התמונה שלי?", "מעלים תמונה רגילה, אפילו מהטלפון. הרקע מוסר אוטומטית והדמות משתלבת בעיצוב עם תאורה מתאימה. בלי תמונה, העיצוב נבנה סביב טיפוגרפיה ואביזרים."],
  ["אפשר לשלב בסרטון קטעים מהקורס שלי?", "כן. מעלים שיעור מוקלט (עד 2GB) או מדביקים קישור, הסוכן צופה בו, מסמן את הרגעים החזקים ומשלב אותם בסרטון, גם עם הקול של המרצה עצמו."],
  ["אפשר לתקן סרטון אחרי שהוא מוכן?", `כן. בעורך הסרטון מתקנים שגיאת כתיב, משנים צבע, מדגישים מילה, מורידים אנימציה או קטע שלם, ורואים את השינוי מיד. אפשר גם פשוט לבקש מהסוכן. השמירה יוצרת גרסה חדשה (${COST.videoEdit} קרדיטים) והמקור נשאר.`],
  ["הקריינות נשמעת כמו רובוט?", "לא. הקריינים הם קולות ישראליים, והתסריט נכתב ונבדק כך שלא יופיעו בו מילים שאפשר לקרוא בשתי דרכים, כדי שכל משפט יישמע טבעי ומדויק."],
  ["אפשר להשתמש בתוצרים בפרסום ממומן?", "כן. כל מה שהורדתם הוא שלכם לשימוש עסקי ופרסומי, גם אחרי סיום המנוי. במסלול החינמי יש על הקבצים חותמת קטנה."],
  ["מה זה קרדיטים?", `קרדיטים משמשים לפעולות שמפעילות את המודלים: שלושה כיוונים עולים ${COST.concepts}, סרטון ${COST.video}, גרסה ערוכה של סרטון ${COST.videoEdit}, ושינוי בשיחה ${COST.edit}. עריכה בעורך והורדות לא עולות כלום. מכסה חודשית מתחדשת, ואפשר להוסיף חבילה.`],
  ["אפשר לבטל?", "בכל רגע, מתוך החשבון. המסלול ממשיך לעבוד עד סוף התקופה ששולמה, בלי חיובים נוספים."],
  ["זה רק לקורסים?", "לא. הסטודיו נבנה במרכז ההכשרות של אניגמה, ולכן הוא מצטיין בקורסים, אבל הוא עובד לכל השקה: סדנה, שירות, מוצר, אירוע או עסק."],
];

export default function Home() {
  const hero = SHOWCASE[0];
  return (
    <div>
      {/* Hero: always dark, like a screening room. */}
      <section className="relative isolate overflow-hidden bg-[#0b0b14] text-white">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-40 left-1/2 h-[640px] w-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,#7c3aed66,transparent)] blur-2xl" />
          <div className="absolute bottom-0 right-0 h-[420px] w-[620px] rounded-full bg-[radial-gradient(closest-side,#c084fc33,transparent)] blur-2xl" />
        </div>
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 pb-20 pt-16 lg:grid-cols-[1.05fr_1fr] lg:pb-28 lg:pt-24">
          <div>
            <p className="mb-5 inline-flex rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-sm font-semibold text-white/80 backdrop-blur">מבית מרכז ההכשרות של אניגמה</p>
            <h1 className="text-5xl font-black leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
              ערכת השקה שלמה.
              <br />
              <span className="bg-gradient-to-l from-[#c084fc] via-[#a78bfa] to-[#7c3aed] bg-clip-text text-transparent">בשיחה אחת.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/75 sm:text-xl">
              מספרים לסוכן מה משיקים, ומקבלים גרפיקות, מודעות וסרטוני פרומו עם קריינות ישראלית. בקו עיצובי אחד, בכל הגדלים, ובשליטה מלאה שלכם.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/signup" className="rounded-full bg-[#7c3aed] px-8 py-4 text-lg font-bold text-white shadow-xl shadow-[#7c3aed]/40 transition hover:bg-[#6d28d9]">
                יוצרים ערכה בחינם
              </Link>
              <a href="#examples" className="rounded-full border border-white/20 px-8 py-4 text-lg font-bold text-white transition hover:bg-white/10">
                לדוגמאות
              </a>
            </div>
            <p className="mt-4 text-sm text-white/50">
              15 קרדיטים בחינם בכל חודש · בלי כרטיס אשראי ·{" "}
              <a href="#tutorial" className="font-semibold text-white/80 underline-offset-4 hover:text-white hover:underline">
                ▶ סרטון הדרכה ({TUTORIAL.length})
              </a>
            </p>
          </div>

          {hero && (
            // A fixed left-to-right collage: the graphic across the top, the story video and a feed
            // post overlapping only its lower corners, so neither covers the face or the headline.
            <div dir="ltr" className="relative mx-auto aspect-[1/0.86] w-full max-w-xl" aria-label="דוגמה לערכה שנוצרה בסטודיו">
              {/* eslint-disable-next-line @next/next/no-img-element -- static showcase files */}
              <img src={hero.kit[0].file} alt="גרפיקת תצוגה לדוגמה" className="absolute left-0 top-0 w-full rounded-2xl border border-white/10 shadow-2xl shadow-black/60" />
              {/* eslint-disable-next-line @next/next/no-img-element -- static showcase files */}
              <img
                src={SHOWCASE[1]?.kit[1].file ?? hero.kit[1].file}
                alt="מודעה בפיד לדוגמה"
                className="absolute bottom-0 left-[4%] w-[32%] -rotate-3 rounded-2xl border border-white/10 shadow-2xl shadow-black/60"
              />
              <div className="absolute bottom-0 right-[3%] w-[25%] rotate-2 rounded-[1.6rem] border-[5px] border-[#1c1c2b] bg-black shadow-2xl shadow-black/60">
                <video src={hero.video} poster={hero.poster} autoPlay muted loop playsInline aria-label="סרטון פרומו לדוגמה" className="aspect-[9/16] w-full rounded-[1.3rem] object-cover" />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* What one kit holds. */}
      <section className="border-b border-border bg-surface">
        <ul className="mx-auto grid max-w-5xl grid-cols-2 gap-6 px-4 py-10 text-center md:grid-cols-4">
          {[
            ["3", "כיוונים עיצוביים לבחירה"],
            ["4", "גדלים לכל גרפיקה"],
            ["2", "סוגי סרטונים עם קריינות"],
            ["~3", "דקות משיחה לכיוונים"],
          ].map(([n, t]) => (
            <li key={t}>
              <p className="text-4xl font-black text-brand">{n}</p>
              <p className="mt-1 text-sm font-semibold text-muted">{t}</p>
            </li>
          ))}
        </ul>
      </section>

      <section id="how" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20">
        <SectionHead kicker="איך זה עובד" title="משיחה לערכת השקה, בלי מעצב ובלי בריף" />
        <ol className="grid gap-5 md:grid-cols-3">
          {STEPS.map((s) => (
            <li key={s.n} className="relative rounded-3xl border border-border bg-surface p-7">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-brand text-lg font-black text-white shadow-lg shadow-brand/30">{s.n}</span>
              <h3 className="mt-5 text-xl font-black">{s.title}</h3>
              <p className="mt-2 leading-relaxed text-muted">{s.text}</p>
            </li>
          ))}
        </ol>
        <div id="tutorial" className="mx-auto mt-14 max-w-4xl scroll-mt-24">
          <h3 className="text-center text-2xl font-black md:text-3xl">ככה זה נראה, תוך {TUTORIAL.length}</h3>
          <p className="mx-auto mt-2 max-w-2xl text-center text-muted">מהשיחה הראשונה עם הסוכן ועד סרטון מוכן: כיוונים, הערכה בכל הגדלים, שינויים, סרטונים ועורך הסרטון.</p>
          <div className="mt-8">
            <TutorialVideo />
          </div>
        </div>
      </section>

      <section id="examples" className="scroll-mt-20 bg-surface py-20">
        <div className="mx-auto max-w-7xl px-4">
          <SectionHead kicker="דוגמאות אמיתיות" title="יצאו מהסטודיו, בלי תיקונים ידניים" sub="שלושה עסקים, שיחה אחת עם הסוכן לכל אחד. העסקים והאנשים בדוגמאות בדויים, והתמונות שלהם נוצרו ב־AI." />
          <Examples kits={SHOWCASE} />
        </div>
      </section>

      <section id="videos" className="relative isolate scroll-mt-20 overflow-hidden bg-[#0b0b14] py-20 text-white">
        <div aria-hidden className="absolute left-1/2 top-0 -z-10 h-[480px] w-[800px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,#7c3aed44,transparent)] blur-2xl" />
        <div className="mx-auto max-w-6xl px-4">
          <div className="mb-12 text-center">
            <p className="text-sm font-bold text-[#a78bfa]">סרטונים</p>
            <h2 className="mt-2 text-3xl font-black sm:text-4xl">פרומו עם קול ישראלי, כתוביות ומוזיקה</h2>
            <p className="mx-auto mt-3 max-w-2xl text-white/70">הסוכן כותב תסריט, קריין ישראלי מקריא, הכתוביות מתוזמנות למילה, והמוזיקה מולחנת לסרטון. כשלוש דקות לסרטון, בגודל סטורי.</p>
          </div>
          <div className="grid justify-items-center gap-10 sm:grid-cols-3">
            {SHOWCASE.map((k) => (
              <PhoneVideo key={k.id} src={k.video} poster={k.poster} label={`פרומו: ${k.field}`} />
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20">
        <SectionHead kicker="מה מקבלים" title="סטודיו שלם, בתוך שיחה" />
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <li key={f.title} className="rounded-3xl border border-border bg-surface p-7">
              <span aria-hidden className="flex size-11 items-center justify-center rounded-2xl bg-brand/10 text-xl text-brand">
                {f.icon}
              </span>
              <h3 className="mt-4 text-lg font-black">{f.title}</h3>
              <p className="mt-2 leading-relaxed text-muted">{f.text}</p>
            </li>
          ))}
        </ul>
        <div className="mt-12 text-center">
          <p className="text-sm font-bold text-muted">מתאים ל</p>
          <ul className="mt-3 flex flex-wrap justify-center gap-2">
            {FOR_WHO.map((x) => (
              <li key={x} className="rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold">
                {x}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="pricing" className="scroll-mt-20 bg-surface py-20">
        <div className="mx-auto max-w-7xl px-4">
          <SectionHead kicker="מחירים" title="מתחילים בחינם, משדרגים כשמוכנים" sub="כל המחירים כוללים מע״מ. ביטול בכל רגע." />
          <Pricing />
        </div>
      </section>

      <section id="faq" className="mx-auto max-w-3xl scroll-mt-20 px-4 py-20">
        <SectionHead kicker="שאלות" title="שאלות שחוזרות" />
        <div className="divide-y divide-border rounded-3xl border border-border bg-surface">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group p-5 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold">
                {q}
                <span aria-hidden className="text-xl text-brand transition group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-3 leading-relaxed text-muted">{a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="px-4 pb-20">
        <div className="relative isolate mx-auto max-w-5xl overflow-hidden rounded-[2rem] bg-[#0b0b14] px-6 py-16 text-center text-white">
          <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,#7c3aed66,transparent_60%)]" />
          <h2 className="text-3xl font-black sm:text-5xl">ההשקה הבאה שלכם מתחילה בשיחה</h2>
          <p className="mx-auto mt-4 max-w-xl text-white/70">פותחים חשבון, מספרים לסוכן מה משיקים, ותוך דקות יש לכם כיוונים לבחור מהם.</p>
          <Link href="/signup" className="mt-8 inline-block rounded-full bg-[#7c3aed] px-9 py-4 text-lg font-bold text-white shadow-xl shadow-[#7c3aed]/40 transition hover:bg-[#6d28d9]">
            יוצרים ערכה בחינם
          </Link>
        </div>
      </section>
    </div>
  );
}

function SectionHead({ kicker, title, sub }: { kicker: string; title: string; sub?: string }) {
  return (
    <div className="mb-12 text-center">
      <p className="text-sm font-bold text-brand">{kicker}</p>
      <h2 className="mt-2 text-3xl font-black sm:text-4xl">{title}</h2>
      {sub && <p className="mx-auto mt-3 max-w-2xl text-muted">{sub}</p>}
    </div>
  );
}
