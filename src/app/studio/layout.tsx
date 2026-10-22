import Link from "next/link";
import { signOut } from "../(auth)/actions";
import { CreditsBadge, UpgradeDialog } from "@/components/account";

export default function StudioLayout({ children }: LayoutProps<"/studio">) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-bg/80 px-4 backdrop-blur">
        <Link href="/studio" className="text-lg font-black" dir="ltr">
          Enigma <span className="text-brand">Studio</span>
        </Link>
        <div className="flex items-center gap-2">
          <CreditsBadge />
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
