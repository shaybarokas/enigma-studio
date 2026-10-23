import Link from "next/link";
import { signOut } from "../(auth)/actions";
import { CreditsBadge, UpgradeDialog } from "@/components/account";
import { WA_TEXT, WhatsAppIcon, WhatsAppLink } from "@/components/whatsapp";

export default function StudioLayout({ children }: LayoutProps<"/studio">) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-bg/80 px-4 backdrop-blur">
        <Link href="/studio" className="text-lg font-black" dir="ltr">
          Enigma <span className="text-brand">Studio</span>
        </Link>
        <div className="flex items-center gap-2">
          <CreditsBadge />
          <WhatsAppLink
            text={WA_TEXT.studio}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold text-muted transition hover:bg-surface hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <WhatsAppIcon className="size-4" />
            <span className="hidden sm:inline">עזרה בוואטסאפ</span>
          </WhatsAppLink>
          <form action={signOut}>
          <button className="rounded-full px-3 py-1.5 text-sm font-semibold text-muted transition hover:bg-surface hover:text-text">
            יציאה
            </button>
          </form>
        </div>
      </header>
      {children}
      <UpgradeDialog />
    </div>
  );
}
