// Temporary home until the marketing site (phase 7): brand line, promise, the four formats.
const formats = [
  { label: "16:9", name: "תצוגה ומצגת", w: 176, h: 99, tilt: "-6deg", delay: "0s" },
  { label: "1:1", name: "פיד", w: 120, h: 120, tilt: "4deg", delay: "1.2s" },
  { label: "3:4", name: "פוסט", w: 108, h: 144, tilt: "-3deg", delay: "2.1s" },
  { label: "9:16", name: "סטורי וסרטונים", w: 90, h: 160, tilt: "7deg", delay: "0.6s" },
];

export default function Home() {
  return (
    <main className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-4 py-20">
      <div
        aria-hidden
        className="glow pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, var(--neon), transparent 65%)" }}
      />

      <p className="relative mb-4 rounded-full border border-border bg-surface/70 px-4 py-1 text-sm text-muted backdrop-blur">
        בקרוב · מבית אניגמה
      </p>
      <h1 className="relative text-center text-5xl font-black tracking-tight sm:text-7xl">
        Enigma <span className="text-brand">Studio</span>
      </h1>
      <p className="relative mt-5 max-w-xl text-center text-lg leading-relaxed text-muted sm:text-xl">
        מספרים לסוכן על מה אתם משיקים, ומקבלים ערכת השקה שלמה: גרפיקות, מודעות וסרטונים מרהיבים, בקו עיצובי
        אחד ובשליטה מלאה שלכם.
      </p>

      <ul className="relative mt-14 flex flex-wrap items-end justify-center gap-6" aria-label="הגדלים שהסטודיו מייצר">
        {formats.map((f) => (
          <li
            key={f.label}
            className="float flex flex-col items-center gap-3"
            style={{ ["--tilt" as string]: f.tilt, animationDelay: f.delay }}
          >
            <div
              className="flex items-center justify-center rounded-2xl border border-white/20 font-bold text-white shadow-2xl"
              style={{
                width: f.w,
                height: f.h,
                background: "linear-gradient(140deg, var(--brand-strong), var(--brand) 55%, var(--neon))",
              }}
            >
              <span dir="ltr">{f.label}</span>
            </div>
            <span className="text-sm text-muted">{f.name}</span>
          </li>
        ))}
      </ul>
    </main>
  );
}
