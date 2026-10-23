"use client";

import { WA_TEXT, WhatsAppIcon, WhatsAppLink } from "@/components/whatsapp";
import Link from "next/link";
import { useState } from "react";
import { COST, PACKS, PLANS, PLAN_FEATURES, ils, type Interval, type PlanId } from "@/lib/plans";

const ORDER: PlanId[] = ["free", "basic", "pro", "business"];

// The plans, with the monthly/annual switch. Everything starts from sign-up; paying happens inside.
export function Pricing() {
  const [period, setPeriod] = useState<Interval>("year");
  return (
    <div className="space-y-8">
      <div className="flex justify-center">
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
          const featured = id === "pro";
          const monthly = period === "year" ? Math.round(p.price.year / 12) : p.price.month;
          return (
            <li key={id} className={`relative flex flex-col rounded-3xl border p-6 ${featured ? "border-brand bg-gradient-to-b from-brand/10 to-surface shadow-xl shadow-brand/10" : "border-border bg-surface"}`}>
              {featured && <span className="absolute -top-3 start-6 rounded-full bg-brand px-3 py-1 text-xs font-bold text-white">הכי משתלם</span>}
              <h3 className="text-xl font-black">{p.name}</h3>
              <p className="mt-3">
                <span className="text-4xl font-black">{ils(monthly)}</span>
                {id !== "free" && <span className="text-sm text-muted"> לחודש</span>}
              </p>
              <p className="h-5 text-xs text-muted">{id !== "free" && period === "year" ? `${ils(p.price.year)} בתשלום שנתי אחד` : id === "free" ? "בלי כרטיס אשראי" : ""}</p>
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
              <Link
                href="/signup"
                className={`mt-6 rounded-full py-2.5 text-center font-bold transition ${featured ? "bg-brand text-white shadow-lg shadow-brand/30 hover:bg-brand-strong" : "border border-brand text-brand hover:bg-brand/10"}`}
              >
                {id === "free" ? "מתחילים בחינם" : `מתחילים ב${p.name}`}
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="mx-auto grid max-w-4xl gap-4 rounded-3xl border border-border bg-surface p-6 text-sm sm:grid-cols-2">
        <div>
          <p className="font-black">מה עולה כמה</p>
          <ul className="mt-2 space-y-1 text-muted">
            <li>שלושה כיוונים עיצוביים, עם תמונות שנוצרות במיוחד: {COST.concepts} קרדיטים</li>
            <li>שינוי בשיחה עם הסוכן: {COST.edit} קרדיט ({COST.editWithScene} עם רקע חדש)</li>
            <li>סרטון עם קריינות, כתוביות ומוזיקה: {COST.video} קרדיטים</li>
            <li>עריכה ידנית בעורך והורדות: בלי הגבלה, בלי קרדיטים</li>
          </ul>
        </div>
        <div>
          <p className="font-black">נגמרו הקרדיטים באמצע החודש?</p>
          <p className="mt-2 text-muted">
            חבילות חד־פעמיות: {PACKS.map((p) => `${p.credits} קרדיטים ב־${ils(p.price)}`).join(" או ")}. הקרדיטים מחבילה לא פגים. ביטול המנוי בכל רגע, מתוך החשבון.
          </p>
        </div>
      </div>
      <p className="text-center text-sm text-muted">
        לא בטוחים איזה מסלול מתאים?{" "}
        <WhatsAppLink text={WA_TEXT.pricing} className="inline-flex items-center gap-1.5 font-bold text-brand underline-offset-2 hover:underline">
          <WhatsAppIcon className="size-4" />
          דברו עם ליאור בוואטסאפ
        </WhatsAppLink>
      </p>
    </div>
  );
}
