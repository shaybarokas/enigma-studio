"use client";

// The signed-in account on the client: plan and credit balance (one shared store), the header
// badge, and the upgrade prompt every paywalled action opens (402 from the API).
import { WA_TEXT, WhatsAppIcon, WhatsAppLink } from "./whatsapp";
import Link from "next/link";
import { useEffect, useSyncExternalStore } from "react";
import type { PlanId } from "@/lib/plans";

type Account = { plan: PlanId; credits: number; freeVideoUsed: boolean; kitPasses: number };
type State = { account: Account | null; upgrade: string | null };

let state: State = { account: null, upgrade: null };
const listeners = new Set<() => void>();
const set = (next: Partial<State>) => {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
};
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const SERVER: State = { account: null, upgrade: null };

let loading: Promise<void> | null = null;
export function refreshAccount() {
  loading = fetch("/api/account")
    .then((r) => (r.ok ? r.json() : null))
    .then((a: Account | null) => {
      if (a) set({ account: a });
    })
    .catch(() => {})
    .finally(() => (loading = null));
  return loading;
}

export function useAccount() {
  const s = useSyncExternalStore(subscribe, () => state, () => SERVER);
  useEffect(() => {
    if (!state.account && !loading) refreshAccount();
  }, []);
  return s.account;
}

export const showUpgrade = (message: string) => set({ upgrade: message });

/** For API responses: opens the upgrade prompt on 402 and returns true. Refreshes the balance after paid actions. */
export function paywalled(res: Response, data: { error?: string }) {
  if (res.status === 402) {
    showUpgrade(data.error ?? "הפעולה הזו כלולה במסלולים בתשלום.");
    refreshAccount();
    return true;
  }
  if (res.ok) refreshAccount();
  return false;
}

/** Thrown after the upgrade prompt opened, so callers skip their own error banner. */
export class Paywalled extends Error {}

export function CreditsBadge() {
  const a = useAccount();
  if (!a) return null;
  const low = a.credits < 10;
  return (
    <Link
      href="/studio/billing"
      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-bold transition hover:border-brand ${low ? "border-danger/40 text-danger" : "border-border text-text"}`}
      title="קרדיטים ומסלול"
    >
      <span aria-hidden>✦</span>
      <span>{a.credits}</span>
      <span className="font-semibold text-muted">קרדיטים</span>
      {a.plan === "free" && <span className="ms-1 rounded-full bg-brand px-2 py-0.5 text-xs text-white">שדרוג</span>}
    </Link>
  );
}

export function UpgradeDialog() {
  const { upgrade } = useSyncExternalStore(subscribe, () => state, () => SERVER);
  useEffect(() => {
    if (!upgrade) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && set({ upgrade: null });
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [upgrade]);
  if (!upgrade) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => set({ upgrade: null })}>
      <div role="dialog" aria-modal="true" aria-labelledby="upgrade-title" className="w-full max-w-md rounded-3xl border border-border bg-surface p-6 text-center shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-brand/15 text-2xl text-brand" aria-hidden>
          ✦
        </div>
        <h2 id="upgrade-title" className="text-xl font-black">
          רוצים להמשיך ליצור?
        </h2>
        <p className="mt-2 text-muted">{upgrade}</p>
        <ul className="mt-4 space-y-1 text-start text-sm">
          <li>✓ כל 4 הגדלים, בלי חותמת</li>
          <li>✓ סרטוני פרומו ושיווק עם קריינות ישראלית</li>
          <li>✓ הורדת כל הערכה בלחיצה אחת</li>
        </ul>
        <Link
          href="/studio/billing"
          onClick={() => set({ upgrade: null })}
          className="mt-6 block rounded-full bg-brand py-3 font-bold text-white shadow-lg shadow-brand/30 transition hover:bg-brand-strong"
        >
          לצפייה במסלולים
        </Link>
        <button onClick={() => set({ upgrade: null })} className="mt-2 w-full rounded-full py-2 text-sm font-semibold text-muted hover:text-text">
          אחר כך
        </button>
        <WhatsAppLink text={WA_TEXT.billing} className="mt-1 inline-flex items-center justify-center gap-1.5 text-sm font-semibold text-brand underline-offset-2 hover:underline">
          <WhatsAppIcon className="size-4" />
          שאלה על המנוי? עזרה בוואטסאפ
        </WhatsAppLink>
      </div>
    </div>
  );
}
