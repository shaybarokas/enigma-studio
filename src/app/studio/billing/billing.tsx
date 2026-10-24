"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { refreshAccount } from "@/components/account";
import { COST, PACKS, PLANS, PLAN_FEATURES, discounted, ils, type Interval, type PaidPlan, type PlanId } from "@/lib/plans";

export type BillingAccount = {
  plan: PlanId;
  interval: Interval | null;
  credits: number;
  extra: number;
  periodEnd: string;
  nextRefill: string;
  cancelAtPeriodEnd: boolean;
  last4: string | null;
  kitPasses: number;
  discountUntil: string | null;
  marketing: boolean; // opted in to marketing email
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
  const [code, setCode] = useState("");
  const [discount, setDiscount] = useState<{ code: string; percent: number; months: number } | null>(null);
  const [codeMsg, setCodeMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const applyCode = async () => {
    if (!code.trim()) return;
    setBusy("code");
    setCodeMsg(null);
    const res = await fetch("/api/billing/coupon", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) });
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) return setCodeMsg({ ok: false, text: data.error ?? "הקוד לא התקבל" });
    setCode("");
    if (data.kind === "kit") {
      setCodeMsg({ ok: true, text: "🎁 ערכה מלאה במתנה נוספה לחשבון! פותחים אותה מתוך הערכה שבוחרים, והקרדיטים שלה כבר בפנים." });
      refreshAccount();
      router.refresh();
    } else {
      setDiscount({ code: data.code, percent: data.percent, months: data.months });
      setCodeMsg({ ok: true, text: `הקוד הופעל: ${data.percent}% הנחה ${data.months === 12 ? "לשנה הראשונה" : `ל־${data.months} החודשים הראשונים`}. המחירים למטה כבר מעודכנים.` });
    }
  };

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
          {paid && account.discountUntil && new Date(account.discountUntil) > new Date() && (
            <p className="mt-1 text-sm font-semibold text-brand">מחיר מוזל בקוד הנחה עד {date(account.discountUntil)}</p>
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
            <li>סרטון עם קריינות: {COST.video} קרדיטים (+{COST.motion} לקטע וידאו AI)</li>
            <li>גרסה ערוכה של סרטון: {COST.videoEdit} קרדיטים</li>
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
            const pay = (n: number) => (discount && id !== "free" ? discounted(n, discount.percent) : n);
            const monthly = period === "year" ? Math.round(pay(p.price.year) / 12) : pay(p.price.month);
            return (
              <li
                key={id}
                className={`relative flex flex-col rounded-3xl border p-6 ${featured ? "border-brand bg-gradient-to-b from-brand/10 to-surface shadow-xl shadow-brand/10" : "border-border bg-surface"}`}
              >
                {featured && <span className="absolute -top-3 start-6 rounded-full bg-brand px-3 py-1 text-xs font-bold text-white">הכי משתלם</span>}
                <h2 className="text-xl font-black">{p.name}</h2>
                <p className="mt-3">
                  {discount && id !== "free" && (
                    <span className="me-2 text-lg font-bold text-muted line-through">{ils(period === "year" ? Math.round(p.price.year / 12) : p.price.month)}</span>
                  )}
                  <span className="text-4xl font-black">{ils(monthly)}</span>
                  {id !== "free" && <span className="text-sm text-muted"> לחודש</span>}
                </p>
                <p className="h-5 text-xs text-muted">{id !== "free" && period === "year" ? `${ils(pay(p.price.year))} בתשלום שנתי אחד` : ""}</p>
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
                    onClick={() => buy(id, { kind: "subscribe", plan: id, interval: period, coupon: discount?.code })}
                    disabled={busy !== null}
                    className={`mt-6 rounded-full py-2.5 font-bold transition disabled:opacity-60 ${featured ? "bg-brand text-white shadow-lg shadow-brand/30 hover:bg-brand-strong" : "border border-brand text-brand hover:bg-brand/10"}`}
                  >
                    {busy === id ? "פותח תשלום מאובטח…" : paid && account.plan === id ? `מעבר לתשלום ${period === "year" ? "שנתי" : "חודשי"}` : paid && ORDER.indexOf(id) < ORDER.indexOf(account.plan) ? `מעבר ל${p.name}` : `שדרוג ל${p.name}`}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
        {paid && <p className="text-center text-xs text-muted">מעבר מסלול מתחיל תקופה חדשה מהיום, עם מכסת הקרדיטים המלאה של המסלול החדש.</p>}
      </section>

      {/* Coupon codes: a discount for the plans above, or a gift kit. */}
      <section className="mx-auto max-w-xl rounded-2xl border border-dashed border-border p-5 text-center">
        <p className="font-bold">יש לך קוד?</p>
        <p className="text-sm text-muted">קוד הנחה, או קוד של ערכה במתנה (למשל למרצי אניגמה)</p>
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            applyCode();
          }}
        >
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            dir="ltr"
            placeholder="ENIGMA-XXXX"
            aria-label="קוד"
            className="min-w-0 flex-1 rounded-full border border-border bg-bg px-4 py-2.5 text-center font-bold uppercase tracking-wider outline-none focus:border-brand"
          />
          <button disabled={busy !== null || !code.trim()} className="rounded-full bg-text px-5 py-2.5 text-sm font-bold text-bg disabled:opacity-50">
            {busy === "code" ? "בודק…" : "הפעלה"}
          </button>
        </form>
        {codeMsg && <p className={`mt-3 text-sm font-semibold ${codeMsg.ok ? "text-ok" : "text-danger"}`}>{codeMsg.text}</p>}
        {account.kitPasses > 0 && <p className="mt-2 text-sm text-brand">🎁 מחכה לך {account.kitPasses === 1 ? "ערכה מלאה אחת" : `${account.kitPasses} ערכות מלאות`} במתנה. פותחים מתוך הערכה.</p>}
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

      <MarketingToggle initial={account.marketing} />

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
            <button onClick={() => setCancel(true)} disabled={busy !== null} className="py-2 hover:text-text hover:underline">
              ביטול המסלול
            </button>
          )}
        </p>
      )}
    </main>
  );
}

// Marketing email on or off (service email about the account always arrives).
function MarketingToggle({ initial }: { initial: boolean }) {
  const [on, setOn] = useState(initial);
  const [busy, setBusy] = useState(false);
  const toggle = async () => {
    setBusy(true);
    const res = await fetch("/api/account", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ marketing: !on }) }).catch(() => null);
    if (res?.ok) setOn(!on);
    setBusy(false);
  };
  return (
    <section className="mx-auto flex w-full max-w-xl items-center justify-between gap-4 rounded-2xl border border-border bg-surface p-4">
      <div>
        <p className="font-bold">טיפים, השראה ומבצעים במייל</p>
        <p className="text-sm text-muted">הודעות על החשבון (תשלומים, סרטון שמוכן) מגיעות בכל מקרה.</p>
      </div>
      <button
        role="switch"
        aria-checked={on}
        aria-label="קבלת טיפים, השראה ומבצעים במייל"
        onClick={toggle}
        disabled={busy}
        className={`relative h-8 w-14 shrink-0 rounded-full transition ${on ? "bg-brand" : "bg-border"} disabled:opacity-60`}
      >
        <span className={`absolute top-1 size-6 rounded-full bg-white shadow transition-all ${on ? "start-7" : "start-1"}`} />
      </button>
    </section>
  );
}
