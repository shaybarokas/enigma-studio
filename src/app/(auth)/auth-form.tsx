"use client";

import { useActionState } from "react";
import type { FormState } from "./actions";

type Field = { name: string; label: string; type: string; autoComplete: string };

export function AuthForm({
  action,
  fields,
  submitLabel,
  next,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  fields: Field[];
  submitLabel: string;
  next?: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      {next && <input type="hidden" name="next" value={next} />}
      {fields.map((f) => (
        <label key={f.name} className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold">{f.label}</span>
          <input
            name={f.name}
            type={f.type}
            autoComplete={f.autoComplete}
            required
            dir={f.type === "email" || f.type === "password" ? "ltr" : undefined}
            className="rounded-xl border border-border bg-bg px-4 py-3 text-base outline-none transition focus:border-brand"
          />
        </label>
      ))}
      <div aria-live="polite" className="min-h-6 text-sm">
        {state?.error && <p className="text-danger">{state.error}</p>}
        {state?.done && <p className="font-semibold text-ok">{state.done}</p>}
      </div>
      <button
        type="submit"
        disabled={pending || Boolean(state?.done)}
        className="rounded-full bg-brand px-6 py-3 font-bold text-white transition hover:bg-brand-strong disabled:opacity-60"
      >
        {pending ? "רגע..." : submitLabel}
      </button>
    </form>
  );
}
