import Link from "next/link";
import { signOut } from "../(auth)/actions";
import { CreditsBadge, UpgradeDialog } from "@/components/account";
import { MobileMenu, NavLink } from "@/components/nav-menu";
import { WA_LABEL, WA_TEXT, waHref, WhatsAppIcon, WhatsAppLink } from "@/components/whatsapp";

// The studio's header: the brand, the studio's pages, the credits, help and sign-out. On phones the
// pages, help and sign-out fold into the ☰ menu.
export default function StudioLayout({ children }: LayoutProps<"/studio">) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-2 border-b border-border bg-bg/80 px-4 backdrop-blur">
        <div className="flex min-w-0 items-center gap-1">
          <Link href="/studio" className="whitespace-nowrap text-lg font-black" dir="ltr">
            Enigma <span className="text-brand">Studio</span>
          </Link>
          <nav aria-label="ניווט הסטודיו" className="ms-4 hidden items-center gap-1 md:flex">
            <NavLink href="/studio">הערכות שלי</NavLink>
            <NavLink href="/studio/billing">מסלולים וקרדיטים</NavLink>
          </nav>
        </div>
        <div className="flex items-center gap-1.5">
          <CreditsBadge />
          <WhatsAppLink
            text={WA_TEXT.studio}
            className="hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold text-muted transition hover:bg-surface hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand md:inline-flex"
          >
            <WhatsAppIcon className="size-4" />
            עזרה בוואטסאפ
          </WhatsAppLink>
          <form action={signOut} className="hidden md:block">
            <button className="rounded-full px-3 py-1.5 text-sm font-semibold text-muted transition hover:bg-surface hover:text-text">יציאה</button>
          </form>
          <div className="md:hidden">
            <MobileMenu
              items={[
                { href: "/studio", label: "הערכות שלי" },
                { href: "/studio/billing", label: "מסלולים וקרדיטים" },
                { href: waHref(WA_TEXT.studio), label: "עזרה בוואטסאפ", external: true, ariaLabel: WA_LABEL, icon: <WhatsAppIcon className="size-5" /> },
              ]}
              footer={
                <form action={signOut}>
                  <button className="text-base font-semibold text-muted hover:text-text">יציאה מהחשבון</button>
                </form>
              }
            />
          </div>
        </div>
      </header>
      {children}
      <UpgradeDialog />
    </div>
  );
}
