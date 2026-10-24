import { notFound } from "next/navigation";
import { Suspense } from "react";
import { isAdmin } from "@/lib/admin";
import type { Coupon } from "@/lib/coupons";
import { getUserAndClient } from "@/lib/kits";
import { PLANS, ils, type PlanId } from "@/lib/plans";
import { createAdminClient } from "@/lib/supabase/admin";
import { CouponForm, CouponToggle } from "./coupon-form";
import { Campaigns, type CampaignRow } from "./campaigns";

const STEP_NAMES: Record<string, string> = {
  "seq:start": "נרשם ולא פתח ערכה (אחרי יום)",
  "seq:choose": "יש כיוונים ולא בחר (אחרי יום)",
  "seq:video": "יש ערכה ואין סרטון (אחרי יומיים)",
  "seq:credits": "חינמי שנגמרו לו הקרדיטים",
  "seq:winback": "לא פעיל 30 יום",
};
import { CREDIT_REASONS, NET_OF_SALE, USD_ILS, type CostAction } from "@/lib/costs";

const ACTION_NAMES: Record<string, string> = {
  interview: "שיחה עם הסוכן (חינם)",
  media: "קריאת תמונות (חינם)",
  concepts: "שלושה כיוונים",
  edit: "שינויים בצ׳אט",
  export: "הורדות (חינם)",
  clips: "קריאת קטעי קורס (חינם)",
  storyboard: "כתיבת תסריט (חינם)",
  video: "סרטונים",
  "video-version": "גרסאות ערוכות",
  "video-edit-agent": "סוכן עריכת סרטון",
  warm: "הכנת שרת ההפקה",
  unknown: "לא משויך",
};

export const metadata = { title: "ניהול | Enigma Studio" };

export default function AdminPage() {
  return (
    <Suspense fallback={<div className="p-20 text-center text-muted">טוען…</div>}>
      <Admin />
    </Suspense>
  );
}

async function Admin() {
  const { user } = await getUserAndClient();
  if (!isAdmin(user)) notFound();
  const db = createAdminClient();
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  // The last 30 days, or since costs were first recorded (credits and revenue from before that had
  // no costs measured against them).
  const { data: first } = await db.from("costs").select("created_at").order("id").limit(1).maybeSingle();
  const monthAgo = new Date(new Date().getTime() - 30 * 86_400_000).toISOString();
  const since = first && first.created_at > monthAgo ? first.created_at : monthAgo;
  const [{ data: accounts }, { data: paid }, { data: coupons }, { count: kits }, { data: costRows }, { data: spent }, { data: paid30 }] = await Promise.all([
    db.from("accounts").select("plan, cancel_at_period_end"),
    db.from("orders").select("amount, kind, paid_at").eq("status", "paid").gte("paid_at", monthStart),
    db.from("coupons").select("*").order("created_at", { ascending: false }),
    db.from("kits").select("id", { count: "exact", head: true }),
    db.from("costs").select("action, usd").gte("created_at", since).limit(100000),
    db.from("credit_log").select("reason, delta").lt("delta", 0).gte("created_at", since).limit(100000),
    db.from("orders").select("amount").eq("status", "paid").gte("paid_at", since),
  ]);
  const [{ data: campaigns }, { data: logs }, ...segments] = await Promise.all([
    db.from("campaigns").select("*").order("created_at", { ascending: false }).limit(30),
    db.from("email_log").select("kind").like("kind", "seq:%").gte("sent_at", monthAgo).limit(100000),
    ...(["all", "free", "paid", "inactive"] as const).map((s) => db.rpc("marketing_audience", { p_segment: s })),
  ]);
  const audience = Object.fromEntries((["all", "free", "paid", "inactive"] as const).map((s, i) => [s, (segments[i].data as unknown[] | null)?.length ?? 0]));
  const stepCounts = (logs ?? []).reduce<Record<string, number>>((m, l) => ((m[l.kind] = (m[l.kind] ?? 0) + 1), m), {});
  // Margin, last 30 days: what outside services really cost (costs) against what came in.
  const cost = new Map<string, { usd: number; calls: number }>();
  for (const r of costRows ?? []) {
    const c = cost.get(r.action) ?? { usd: 0, calls: 0 };
    cost.set(r.action, { usd: c.usd + Number(r.usd), calls: c.calls + 1 });
  }
  const creditsBy = (reasons: string[] = []) => (spent ?? []).filter((r) => reasons.includes(r.reason)).reduce((s, r) => s - r.delta, 0);
  const totalCostIls = [...cost.values()].reduce((s, c) => s + c.usd, 0) * USD_ILS;
  const netRevenue = (paid30 ?? []).reduce((s, o) => s + Number(o.amount), 0) * NET_OF_SALE;
  const margin = netRevenue ? Math.round((1 - totalCostIls / netRevenue) * 100) : null;
  // The cheapest credit we sell (the advanced plan, paid yearly), after VAT and clearing.
  const cheapest = (PLANS.business.price.year / 12 / PLANS.business.credits) * NET_OF_SALE;
  const byPlan = (accounts ?? []).reduce<Record<string, number>>((m, a) => ((m[a.plan] = (m[a.plan] ?? 0) + 1), m), {});
  const revenue = (paid ?? []).reduce((s, o) => s + Number(o.amount), 0);
  const stats: [string, string][] = [
    ["משתמשים", String(accounts?.length ?? 0)],
    ["מנויים בתשלום", String((accounts ?? []).filter((a) => a.plan !== "free").length)],
    ["ערכות שנוצרו", String(kits ?? 0)],
    ["הכנסות החודש", ils(revenue)],
  ];

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 space-y-10 px-4 py-8">
      <h1 className="text-2xl font-black">ניהול הסטודיו</h1>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map(([k, v]) => (
          <div key={k} className="rounded-2xl border border-border bg-surface p-4">
            <p className="text-sm text-muted">{k}</p>
            <p className="text-2xl font-black">{v}</p>
          </div>
        ))}
      </section>
      <p className="-mt-6 text-sm text-muted">
        {(Object.keys(PLANS) as PlanId[]).map((p) => `${PLANS[p].name}: ${byPlan[p] ?? 0}`).join(" · ")}
        {` · הכנסות החודש לא כוללות החזרים שבוצעו ב־PayPlus`}
      </p>

      <section className="space-y-3">
        <h2 className="text-xl font-black">רווחיות · מ־{new Date(since).toLocaleDateString("he-IL")}</h2>
        <p className="text-sm text-muted">
          עלות אמיתית של כל קריאה לשירות חיצוני (Claude, תמונות, קריינות, מוזיקה, הפקה), מול ההכנסה נטו (אחרי מע״מ וסליקה). דולר מחושב לפי ₪{USD_ILS}. לא
          כולל מנויים קבועים (Vercel, Supabase, ElevenLabs).
        </p>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {[
            ["הכנסות נטו", ils(Math.round(netRevenue))],
            ["עלות שירותים", ils(Math.round(totalCostIls))],
            ["רווח גולמי", margin == null ? "אין עדיין הכנסות" : `${margin}%`],
          ].map(([k, v]) => (
            <div key={k} className="rounded-2xl border border-border bg-surface p-4">
              <p className="text-sm text-muted">{k}</p>
              <p className={`text-2xl font-black ${k === "רווח גולמי" && margin != null && margin < 65 ? "text-danger" : ""}`}>{v}</p>
            </div>
          ))}
        </div>
        <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="text-muted">
              <tr className="border-b border-border">
                {["פעולה", "קריאות", "עלות", "קרדיטים שנגבו", "עלות לקרדיט", "רווח בקרדיט הזול ביותר"].map((h) => (
                  <th key={h} className="p-3 text-start font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...cost.entries()]
                .sort((a, b) => b[1].usd - a[1].usd)
                .map(([action, c]) => {
                  const credits = creditsBy(CREDIT_REASONS[action as CostAction]);
                  const perCredit = credits ? (c.usd * USD_ILS) / credits : null;
                  const m = perCredit == null ? null : Math.round((1 - perCredit / cheapest) * 100);
                  return (
                    <tr key={action} className="border-b border-border last:border-0">
                      <td className="p-3 font-semibold">{ACTION_NAMES[action] ?? action}</td>
                      <td className="p-3">{c.calls}</td>
                      <td className="p-3" dir="ltr">
                        ${c.usd.toFixed(2)}
                      </td>
                      <td className="p-3">{credits || "—"}</td>
                      <td className="p-3">{perCredit == null ? "—" : `₪${perCredit.toFixed(3)}`}</td>
                      <td className={`p-3 font-bold ${m != null && m < 65 ? "text-danger" : ""}`}>{m == null ? "—" : `${m}%`}</td>
                    </tr>
                  );
                })}
              {!cost.size && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-muted">
                    עוד אין נתוני עלות.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-black">דיוור</h2>
        <p className="text-sm text-muted">
          רק למי שאישר דיוור בהרשמה או בעמוד המסלול ({audience.all} כרגע). בכל מייל: &quot;פרסומת&quot; בתחילת הנושא, פרטי השולח והסרה בלחיצה. הודעות שירות (תשלום, סרטון מוכן) לא תלויות באישור.
        </p>
        <div className="rounded-2xl border border-border bg-surface p-4 text-sm">
          <p className="mb-2 font-bold">מיילים אוטומטיים · 30 ימים (נשלחים כל בוקר, כל אחד פעם אחת, לכל היותר אחד בשלושה ימים)</p>
          <ul className="grid gap-1 sm:grid-cols-2">
            {Object.entries(STEP_NAMES).map(([k, v]) => (
              <li key={k} className="flex justify-between gap-3 rounded-lg bg-bg px-3 py-1.5">
                <span>{v}</span>
                <strong>{stepCounts[k] ?? 0}</strong>
              </li>
            ))}
          </ul>
        </div>
        <Campaigns rows={(campaigns ?? []) as CampaignRow[]} audience={audience} />
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-black">קודים</h2>
          <p className="text-sm text-muted">
            <strong>ערכה במתנה</strong>: פותחת ערכה אחת עם כל יכולות המסלול בתשלום, ומוסיפה קרדיטים (למשל 60: כיוונים, שינויים ושני סרטונים). למרצה חדש: קוד אחד, שימוש אחד.
            <br />
            <strong>הנחה</strong>: אחוז מהמחיר של מסלול בתשלום, לחודשים שנקבעו (למרצים: 25% ל־12 חודשים). כל משתמש יכול לממש קוד פעם אחת.
          </p>
        </div>
        <CouponForm />
        <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="text-muted">
              <tr className="border-b border-border text-start">
                {["קוד", "סוג", "מה נותן", "מומש", "תוקף", "הערה", ""].map((h) => (
                  <th key={h} className="p-3 text-start font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {((coupons ?? []) as Coupon[]).map((c) => (
                <tr key={c.code} className={`border-b border-border last:border-0 ${c.active ? "" : "opacity-50"}`}>
                  <td className="p-3 font-mono font-bold" dir="ltr">
                    {c.code}
                  </td>
                  <td className="p-3">{c.kind === "kit" ? "ערכה במתנה" : "הנחה"}</td>
                  <td className="p-3">{c.kind === "kit" ? `ערכה מלאה + ${c.credits} קרדיטים` : `${c.percent}% ל־${c.months} חודשים`}</td>
                  <td className="p-3">
                    {c.used}
                    {c.max_uses != null && ` / ${c.max_uses}`}
                  </td>
                  <td className="p-3">{c.expires_at ? new Date(c.expires_at).toLocaleDateString("he-IL") : "ללא"}</td>
                  <td className="p-3 text-muted">{c.note}</td>
                  <td className="p-3">
                    <CouponToggle code={c.code} active={c.active} />
                  </td>
                </tr>
              ))}
              {!coupons?.length && (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-muted">
                    עוד אין קודים.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
