"use client";

import { useActionState, useState, useTransition } from "react";
import { createCoupon, toggleCoupon } from "./actions";

const input = "rounded-xl border border-border bg-bg px-3 py-2 outline-none focus:border-brand";

export function CouponForm() {
  const [state, action, pending] = useActionState(createCoupon, undefined);
  const [kind, setKind] = useState<"kit" | "discount">("kit");
  return (
    <form action={action} className="grid gap-3 rounded-2xl border border-border bg-surface p-5 sm:grid-cols-2 lg:grid-cols-4">
      <label className="flex flex-col gap-1 text-sm font-semibold">
        סוג
        <select
          name="kind"
          value={kind}
          onChange={(e) => setKind(e.target.value as "kit" | "discount")}
          className={input}
        >
          <option value="kit">ערכה במתנה</option>
          <option value="discount">הנחה באחוזים</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm font-semibold">
        קוד
        <input name="code" dir="ltr" placeholder="ריק = קוד אוטומטי" className={`${input} font-mono uppercase`} />
      </label>
      {kind === "kit" ? (
        <label className="flex flex-col gap-1 text-sm font-semibold">
          קרדיטים שמצורפים
          <input name="credits" type="number" min={0} max={1000} defaultValue={60} className={input} />
        </label>
      ) : (
        <>
          <label className="flex flex-col gap-1 text-sm font-semibold">
            אחוז הנחה
            <input name="percent" type="number" min={1} max={100} defaultValue={25} className={input} />
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold">
            לכמה חודשים
            <input name="months" type="number" min={1} max={36} defaultValue={12} className={input} />
          </label>
        </>
      )}
      <label className="flex flex-col gap-1 text-sm font-semibold">
        מקסימום מימושים (ריק = ללא הגבלה)
        <input name="max_uses" type="number" min={1} defaultValue={kind === "kit" ? 1 : undefined} key={kind} className={input} />
      </label>
      <label className="flex flex-col gap-1 text-sm font-semibold">
        בתוקף עד (לא חובה)
        <input name="expires" type="date" className={input} />
      </label>
      <label className="flex flex-col gap-1 text-sm font-semibold sm:col-span-2">
        הערה (למשל שם המרצה והקורס)
        <input name="note" className={input} />
      </label>
      <div className="flex items-end gap-3 sm:col-span-2 lg:col-span-4">
        <button disabled={pending} className="rounded-full bg-brand px-6 py-2.5 font-bold text-white hover:bg-brand-strong disabled:opacity-60">
          {pending ? "יוצר…" : "יצירת קוד"}
        </button>
        {state?.error && <p className="text-sm text-danger">{state.error}</p>}
        {state?.done && <p className="text-sm font-semibold text-ok">{state.done}</p>}
      </div>
    </form>
  );
}

export function CouponToggle({ code, active }: { code: string; active: boolean }) {
  const [pending, start] = useTransition();
  return (
    <button onClick={() => start(() => toggleCoupon(code, !active))} disabled={pending} className="text-sm font-semibold text-brand hover:underline disabled:opacity-50">
      {active ? "השבתה" : "הפעלה"}
    </button>
  );
}
