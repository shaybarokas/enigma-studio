import Link from "next/link";
import { LIOR, WA_TEXT, WhatsAppFloat, WhatsAppLink } from "@/components/whatsapp";
import { MobileMenu } from "@/components/nav-menu";
import { SITE } from "@/lib/site";

const NAV = [
  ["#how", "איך זה עובד"],
  ["#examples", "דוגמאות"],
  ["#videos", "סרטונים"],
  ["#pricing", "מחירים"],
  ["#faq", "שאלות"],
] as const;

// The public site: sticky header, the page, and the footer with the legal links.
export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="sr-only z-50 rounded-full bg-brand px-4 py-2 font-bold text-white focus:not-sr-only focus:fixed focus:start-4 focus:top-3">
        דילוג לתוכן
      </a>
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0b0b14]/80 text-white backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4">
          <Link href="/" className="whitespace-nowrap text-xl font-black" dir="ltr">
            Enigma <span className="text-[#a78bfa]">Studio</span>
          </Link>
          <nav aria-label="ניווט ראשי" className="hidden items-center gap-1 md:flex">
            {NAV.map(([href, label]) => (
              <a key={href} href={`/${href}`} className="rounded-full px-3 py-2 text-sm font-semibold text-white/70 transition hover:bg-white/10 hover:text-white">
                {label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login" className="hidden rounded-full px-3 py-2 text-sm font-semibold text-white/80 hover:text-white sm:inline-block">
              כניסה
            </Link>
            <Link href="/signup" className="whitespace-nowrap rounded-full bg-[#7c3aed] px-4 py-2 text-sm font-bold text-white shadow-lg shadow-[#7c3aed]/40 transition hover:bg-[#6d28d9]">
              מתחילים בחינם
            </Link>
            <div className="md:hidden">
              <MobileMenu tone="dark" top="top-16" items={[...NAV.map(([href, label]) => ({ href: `/${href}`, label })), { href: "/login", label: "כניסה לחשבון" }]} />
            </div>
          </div>
        </div>
      </header>
      <main id="main" className="flex flex-1 flex-col">
        {children}
      </main>
      <footer className="border-t border-border bg-surface">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm">
            <p className="text-lg font-black" dir="ltr">
              Enigma <span className="text-brand">Studio</span>
            </p>
            <p className="mt-2 text-sm text-muted">סטודיו קריאייטיב עם סוכן AI: גרפיקות, מודעות וסרטונים להשקה שלך, בקו עיצובי אחד ובשליטה מלאה. מבית אניגמה.</p>
          </div>
          <nav aria-label="קישורים" className="grid grid-cols-2 gap-x-10 gap-y-2 text-sm">
            <Link href="/signup" className="text-muted hover:text-text">הרשמה</Link>
            <Link href="/terms" className="text-muted hover:text-text">תנאי שימוש</Link>
            <Link href="/login" className="text-muted hover:text-text">כניסה</Link>
            <Link href="/privacy" className="text-muted hover:text-text">מדיניות פרטיות</Link>
            <Link href="/#pricing" className="text-muted hover:text-text">מחירים</Link>
            <Link href="/accessibility" className="text-muted hover:text-text">הצהרת נגישות</Link>
          </nav>
        </div>
        <p className="border-t border-border px-4 py-4 text-center text-xs text-muted">
          © 2026 {SITE.name} · {SITE.operator}, {SITE.operatorType} ·{" "}
          <a href={`mailto:${SITE.contactEmail}`} dir="ltr" className="hover:text-text">
            {SITE.contactEmail}
          </a>{" "}
          ·{" "}
          <WhatsAppLink text={WA_TEXT.site} className="underline-offset-2 hover:text-text hover:underline">
            וואטסאפ: <span dir="ltr">{LIOR.display}</span>
          </WhatsAppLink>
        </p>
      </footer>
      <WhatsAppFloat />
    </div>
  );
}
