import Link from "next/link";
import { Suspense } from "react";
import { balance, getAccount } from "@/lib/credits";
import { getUserAndClient } from "@/lib/kits";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/admin";
import { WA_TEXT, WhatsAppIcon, WhatsAppLink } from "@/components/whatsapp";
import { TrackOnce } from "@/components/meta-pixel";
import { PLANS } from "@/lib/plans";
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
  const { status, order } = await searchParams;
  const { supabase, user } = await getUserAndClient();
  if (!user) return null;
  const a = await getAccount(user.id);
  const { data: more } = await createAdminClient()
    .from("accounts")
    .select("billing_interval, cancel_at_period_end, card_last4, credits_reset_at, extra_credits, kit_passes, discount_until, marketing_consent")
    .eq("user_id", user.id)
    .maybeSingle();
  const { data: orders } = await supabase
    .from("orders")
    .select("id, kind, plan, billing_interval, credits, amount, paid_at, invoice_url")
    .eq("status", "paid")
    .order("paid_at", { ascending: false })
    .limit(12);
  // Back from PayPlus with a paid order: the payment, for the Meta pixel. Only an order of this
  // account that the database marks paid, in the last day (an old link opened again sends nothing).
  const bought =
    status === "paid" && typeof order === "string"
      ? (orders ?? []).find((o) => o.id === order && paidToday(o.paid_at))
      : undefined;
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
    marketing: more?.marketing_consent ?? false,
  };
  return (
    <>
      <Billing account={account} orders={(orders ?? []) as Order[]} status={typeof status === "string" ? status : null} />
      {bought && <TrackOnce events={purchaseEvents(bought as Order)} eventID={bought.id} strip="order" />}
      <p className="pb-8 text-center text-sm text-muted">
        יש שאלה על המנוי או הקרדיטים?{" "}
        <WhatsAppLink text={WA_TEXT.billing} className="inline-flex items-center gap-1.5 font-bold text-brand underline-offset-2 hover:underline">
          <WhatsAppIcon className="size-4" />
          עזרה בוואטסאפ
        </WhatsAppLink>
      </p>
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

const paidToday = (at: string) => Date.now() - new Date(at).getTime() < 86_400_000;

// Purchase for every payment; Subscribe too when it starts a paid plan.
function purchaseEvents(o: Order) {
  const params = {
    value: Number(o.amount),
    currency: "ILS",
    content_type: "product",
    content_ids: [o.kind === "pack" ? `pack-${o.credits}` : `${o.plan}-${o.billing_interval}`],
    content_name: o.kind === "pack" ? `${o.credits} קרדיטים` : `מסלול ${PLANS[o.plan ?? "basic"].name}${o.billing_interval === "year" ? " שנתי" : ""}`,
  };
  return o.kind === "subscribe" ? [{ name: "Purchase", params }, { name: "Subscribe", params }] : [{ name: "Purchase", params }];
}
