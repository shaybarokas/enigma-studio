import type { ReactNode } from "react";

export function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle: string; children: ReactNode; footer: ReactNode }) {
  return (
    <main className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-16">
      <div
        aria-hidden
        className="glow pointer-events-none absolute -top-48 left-1/2 h-[480px] w-[480px] -translate-x-1/2 rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, var(--neon), transparent 65%)" }}
      />
      <div className="relative w-full max-w-md rounded-3xl border border-border bg-surface/90 p-8 shadow-2xl shadow-brand/10 backdrop-blur">
        <p className="mb-2 text-sm font-bold text-brand" dir="ltr">
          Enigma Studio
        </p>
        <h1 className="text-2xl font-extrabold">{title}</h1>
        <p className="mb-6 mt-1 text-sm text-muted">{subtitle}</p>
        {children}
        <div className="mt-6 text-center text-sm text-muted">{footer}</div>
      </div>
    </main>
  );
}
