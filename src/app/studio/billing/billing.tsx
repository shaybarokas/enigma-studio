"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { refreshAccount } from "@/components/account";
import { COST, PACKS, PLANS, PLAN_FEATURES, ils, type Interval, type PaidPlan, type PlanId } from "@/lib/plans";

export type BillingAccount = {
  plan: PlanId;
  interval: Interval | null;
  credits: number;
  extra: number;
  periodEnd: string;
  nextRefill: string;
  cancelAtPeriodEnd: boolean;
  last4: string | null;
};
export type Order = { id: string; kind: "subscribe" | "pack" | "renewal"; plan: PaidPlan | null; billing_interval: Interval | null; credits: number | null; amount: number; paid_at: string; invoice_url: string | null };

const ORDER: PlanId[] = ["free", "basic", "pro", "business"];
const date = (d: string) => new Date(d).toLocaleDateString("he-IL", { day: "numeric", month: "long", year: "numeric" });

const STATUS: Record<string, { text: string; tone: string }> = {
  paid: { text: "התשלום התקבל. תודה! המסלול והקרדיטים כבר מעודכנים.", tone: "bg-ok/10 text-ok" },
  pending: { text: "התשלום בבדיקה. זה לוקח בדרך כלל כמה שניות, רעננו את העמוד בעוד רגע.", tone: "bg-brand/10 text-brand" },
  failed: { text: "התשלום לא עבר. אפשר לנסות שוב, או עם כרטיס אחר.", tone: "bg-danger/10 text-danger" },
};

export function Billing({ account, orders, status }: { account: BillingAccount; orders: Order[]; status: string | null }) {
  const router = useRouter();
  const [period, setPeriod] = useState<Interval>(account.interval ?? "year");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const paid = account.plan !== "free";

  useEffect(() => {
    if (status === "paid") refreshAccount();
  }, [status]);

  const buy = async (key: string, body: object) => {
    setBusy(key);
    setError("");
    const res = await fetch("/api/billing/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.link) {
      setBusy(null);
      return setError(data.error ?? "עמוד התשלום לא נפתח. נסו שוב.");
    }
    window.location.assign(data.link);
  };

  const setCancel = async (cancel: boolean) => {
    if (cancel && !confirm(`לבטל את המסלול? הוא ימשיך לעבוד עד ${date(account.periodEnd)}, ואחר כך תעברו למסלול החינמי. הקרדיטים שקניתם בחבילות נשארים.`)) return;
    setBusy("cancel");
    await fetch("/api/billing/cancel", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cancel }) });
    setBusy(null);
    router.refresh();
  };

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 space-y-12 px-4 py-8">
      {status && STATUS[status] && (
        <div role="status" className={`rounded-2xl p-4 text-center font-semibold ${STATUS[status].tone}`}>
          {STATUS[status].text}
        </div>
      )}

      {/* Where the account stands. */}
      <section className="grid gap-4 rounded-3xl border border-border bg-surface p-6 sm:grid-cols-3">
        <div>
          <p className="text-sm text-muted">המסלול שלך</p>
          <p className="text-2xl font-black">
            {PLANS[account.plan].name}
            {paid && account.interval === "year" && <span className="text-base font-bold text-muted"> · שנתי</span>}
          </p>
          {paid && (
            <p className="mt-1 text-sm text-muted">
              {account.cancelAtPeriodEnd ? `מבוטל, פעיל עד ${date(account.periodEnd)}` : `מתחדש ב־${date(account.periodEnd)}`}
              {account.last4 && !account.cancelAtPeriodEnd && <> · כרטיס שמסתיים ב־<span dir="ltr">{account.last4}</span></>}
            </p>
          )}
        </div>
        <div>
          <p className="text-sm text-muted">קרדיטים זמינים</p>
          <p className="text-2xl font-black text-brand">✦ {account.credits}</p>
          <p className="mt-1 text-sm text-muted">
            מתמלא ל־{PLANS[account.plan].credits} ב־{date(account.nextRefill)}
            {account.extra > 0 && ` · ${account.extra} מחבילות, בלי תפוגה`}
          </p>
        </div>
        <div className="text-sm text-muted">
          <p className="font-bold text-text">מה עולה כמה</p>
          <ul className="mt-1 space-y-0.5">
            <li>3 כיוונים עיצוביים: {COST.concepts} קרדיטים</li>
            <li>שינוי בצ׳אט: {COST.edit} קרדיט, עם רקע חדש: {COST.editWithScene}</li>
            <li>סרטון עם קריינות: {COST.video} קרדיטים</li>
            <li>הורדות ועריכה ידנית: חינם</li>
          </ul>
        </div>
      </section>

      {/* Plans. */}
      <section className="space-y-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <h1 className="text-3xl font-black sm:text-4xl">
            {paid ? "המסלולים" : <>שדרגו לערכת השקה <span className="text-brand">מלאה</span></>}
          </h1>
          {!paid && <p className="max-w-xl text-muted">כל הגדלים, בלי חותמת, סרטוני פרומו ושיווק עם קריינות ישראלית, והורדת כל הערכה בלחיצה אחת.</p>}
          <div className="inline-flex rounded-full border border-border bg-surface p-1" role="radiogroup" aria-label="תדירות חיוב">
            {(["month", "year"] as const).map((i) => (
              <button
                key={i}
                role="radio"
                aria-checked={period === i}
                onClick={() => setPeriod(i)}
                className={`rounded-full px-5 py-2 text-sm font-bold transition ${period === i ? "bg-brand text-white" : "text-muted hover:text-text"}`}
              >
                {i === "month" ? "חודשי" : "שנתי · חודשיים מתנה"}
              </button>
            ))}
          </div>
        </div>

        <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {ORDER.map((id) => {
            const p = PLANS[id];
            const current = account.plan === id && (id === "free" || account.interval === period);
            const featured = id === "pro";
            const monthly = period === "year" ? Math.round(p.price.year / 12) : p.price.month;
            return (
              <li
                key={id}
                className={`relative flex flex-col rounded-3xl border p-6 ${featured ? "border-brand bg-gradient-to-b from-brand/10 to-surface shadow-xl shadow-brand/10" : "border-border bg-surface"}`}
              >
                {featured && <span className="absolute -top-3 start-6 rounded-full bg-brand px-3 py-1 text-xs font-bold text-white">הכי משתלם</span>}
                <h2 className="text-xl font-black">{p.name}</h2>
                <p className="mt-3">
                  <span className="text-4xl font-black">{ils(monthly)}</span>
                  {id !== "free" && <span className="text-sm text-muted"> לחודש</span>}
                </p>
                <p className="h-5 text-xs text-muted">{id !== "free" && period === "year" ? `${ils(p.price.year)} בתשלום שנתי אחד` : ""}</p>
                <ul className="mt-5 flex-1 space-y-2 text-sm">
                  {PLAN_FEATURES[id].map((f) => (
                    <li key={f} className="flex gap-2">
                      <span className="text-brand" aria-hidden>
                        ✓
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
                {id === "free" ? (
                  <p className="mt-6 py-2.5 text-center text-sm font-semibold text-muted">{account.plan === "free" ? "המסלול הנוכחי" : " "}</p>
                ) : current ? (
                  <p className="mt-6 rounded-full border border-brand py-2.5 text-center text-sm font-bold text-brand">המסלול הנוכחי</p>
                ) : (
                  <button
                    onClick={() => buy(id, { kind: "subscribe", plan: id, interval: period })}
                    disabled={busy !== null}
                    className={`mt-6 rounded-full py-2.5 font-bold transition disabled:opacity-60 ${featured ? "bg-brand text-white shadow-lg shadow-brand/30 hover:bg-brand-strong" : "border border-brand text-brand hover:bg-brand/10"}`}
                  >
                    {busy === id ? "פותח תשלום מאובטח…" : paid && ORDER.indexOf(id) < ORDER.indexOf(account.plan) ? `מעבר ל${p.name}` : `שדרוג ל${p.name}`}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
        {paid && <p className="text-center text-xs text-muted">מעבר מסלול מתחיל תקופה חדשה מהיום, עם מכסת הקרדיטים המלאה של המסלול החדש.</p>}
      </section>

      {/* Credit packs. */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-black">צריכים עוד קרדיטים החודש?</h2>
          <p className="text-sm text-muted">חבילות חד־פעמיות. הקרדיטים לא פגים, ומשמשים אחרי המכסה החודשית.</p>
        </div>
        <ul className="grid gap-4 sm:grid-cols-2">
          {PACKS.map((pack) => (
            <li key={pack.id} className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-surface p-5">
              <div>
                <p className="text-lg font-black">✦ {pack.credits} קרדיטים</p>
                <p className="text-sm text-muted">
                  {ils(pack.price)} · {ils(Math.round((pack.price / pack.credits) * 100) / 100)} לקרדיט
                </p>
              </div>
              <button
                onClick={() => buy(pack.id, { kind: "pack", pack: pack.id })}
                disabled={busy !== null}
                className="rounded-full bg-brand px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-strong disabled:opacity-60"
              >
                {busy === pack.id ? "פותח…" : "לרכישה"}
              </button>
            </li>
          ))}
        </ul>
      </section>

      {error && (
        <p role="alert" className="rounded-xl bg-danger/10 p-3 text-center text-sm text-danger">
          {error}
        </p>
      )}

      {/* History and invoices. */}
      {orders.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-black">תשלומים וחשבוניות</h2>
          <ul className="divide-y divide-border rounded-2xl border border-border bg-surface">
            {orders.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 p-4 text-sm">
                <span>
                  <span className="font-bold">
                    {o.kind === "pack" ? `${o.credits} קרדיטים` : `מסלול ${PLANS[o.plan ?? "basic"].name}${o.billing_interval === "year" ? " שנתי" : ""}`}
                    {o.kind === "renewal" && " (חידוש)"}
                  </span>
                  <span className="text-muted"> · {date(o.paid_at)}</span>
                </span>
                <span className="flex items-center gap-3">
                  <span className="font-bold">{ils(Number(o.amount))}</span>
                  {o.invoice_url && (
                    <a href={o.invoice_url} target="_blank" rel="noreferrer" className="font-semibold text-brand hover:underline">
                      חשבונית
                    </a>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="text-center text-sm text-muted">
        <a href="/reset" className="hover:text-text hover:underline">
          שינוי סיסמה
        </a>
      </p>

      {paid && (
        <p className="text-center text-sm text-muted">
          {account.cancelAtPeriodEnd ? (
            <button onClick={() => setCancel(false)} disabled={busy !== null} className="font-semibold text-brand hover:underline">
              חידוש המסלול (ביטול הביטול)
            </button>
          ) : (
            <button onClick={() => setCancel(true)} disabled={busy !== null} className="hover:text-text hover:underline">
              ביטול המסלול
            </button>
          )}
        </p>
      )}
    </main>
  );
}
