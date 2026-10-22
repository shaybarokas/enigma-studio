import Link from "next/link";
import { Suspense } from "react";
import { balance, getAccount } from "@/lib/credits";
import { getUserAndClient } from "@/lib/kits";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/admin";
import { Billing, type BillingAccount, type Order } from "./billing";

export const metadata = { title: "מסלולים וקרדיטים | Enigma Studio" };

export default function BillingPage({ searchParams }: PageProps<"/studio/billing">) {
  return (
    <Suspense fallback={<div className="flex flex-1 items-center justify-center p-20 text-muted">טוען…</div>}>
      <Loader searchParams={searchParams} />
    </Suspense>
  );
}

async function Loader({ searchParams }: { searchParams: PageProps<"/studio/billing">["searchParams"] }) {
  const { status } = await searchParams;
  const { supabase, user } = await getUserAndClient();
  if (!user) return null;
  const a = await getAccount(user.id);
  const { data: more } = await createAdminClient()
    .from("accounts")
    .select("billing_interval, cancel_at_period_end, card_last4, credits_reset_at, extra_credits, kit_passes, discount_until")
    .eq("user_id", user.id)
    .maybeSingle();
  const { data: orders } = await supabase
    .from("orders")
    .select("id, kind, plan, billing_interval, credits, amount, paid_at, invoice_url")
    .eq("status", "paid")
    .order("paid_at", { ascending: false })
    .limit(12);
  const account: BillingAccount = {
    plan: a.plan,
    interval: more?.billing_interval ?? null,
    credits: balance(a),
    extra: more?.extra_credits ?? 0,
    periodEnd: a.period_end,
    nextRefill: a.plan !== "free" && more?.billing_interval === "year" ? (more.credits_reset_at ?? a.period_end) : a.period_end,
    cancelAtPeriodEnd: more?.cancel_at_period_end ?? false,
    last4: more?.card_last4 ?? null,
    kitPasses: more?.kit_passes ?? 0,
    discountUntil: more?.discount_until ?? null,
  };
  return (
    <>
      <Billing account={account} orders={(orders ?? []) as Order[]} status={typeof status === "string" ? status : null} />
      {isAdmin(user) && (
        <p className="pb-8 text-center text-sm">
          <Link href="/studio/admin" className="font-semibold text-brand hover:underline">
            ניהול הסטודיו
          </Link>
        </p>
      )}
    </>
  );
}
