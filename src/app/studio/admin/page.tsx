import { notFound } from "next/navigation";
import { Suspense } from "react";
import { isAdmin } from "@/lib/admin";
import type { Coupon } from "@/lib/coupons";
import { getUserAndClient } from "@/lib/kits";
import { PLANS, ils, type PlanId } from "@/lib/plans";
import { createAdminClient } from "@/lib/supabase/admin";
import { CouponForm, CouponToggle } from "./coupon-form";

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
  const [{ data: accounts }, { data: paid }, { data: coupons }, { count: kits }] = await Promise.all([
    db.from("accounts").select("plan, cancel_at_period_end"),
    db.from("orders").select("amount, kind, paid_at").eq("status", "paid").gte("paid_at", monthStart),
    db.from("coupons").select("*").order("created_at", { ascending: false }),
    db.from("kits").select("id", { count: "exact", head: true }),
  ]);
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
