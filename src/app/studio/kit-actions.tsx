"use client";

// A kit card's menu in the list: rename it, or delete it for good.
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

export function KitActions({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(title);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const menu = useId();
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const away = (e: Event) => !box.current?.contains(e.target as Node) && setOpen(false);
    const key = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", key);
    };
  }, [open]);

  const call = async (init: RequestInit) => {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/kits/${id}`, { headers: { "Content-Type": "application/json" }, ...init }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    setBusy(false);
    if (!res?.ok) {
      setError(data?.error ?? "משהו השתבש. נסו שוב.");
      return false;
    }
    router.refresh();
    return true;
  };
  const rename = async () => {
    if (!name.trim() || name.trim() === title) return setRenaming(false);
    if (await call({ method: "PATCH", body: JSON.stringify({ title: name }) })) setRenaming(false);
  };
  const remove = async () => {
    setOpen(false);
    if (!confirm(`למחוק את "${title}"? הגרפיקות, הסרטונים והקבצים שלה יימחקו לצמיתות.`)) return;
    await call({ method: "DELETE" });
  };

  return (
    <div ref={box} className="absolute left-2 top-2 z-10">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={`פעולות לערכה ${title}`}
        aria-expanded={open}
        aria-controls={menu}
        disabled={busy}
        className="grid size-9 place-items-center rounded-full bg-black/55 text-lg font-black text-white backdrop-blur transition hover:bg-black/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >
        {busy ? "…" : "⋯"}
      </button>
      {open && (
        <div id={menu} className="absolute left-0 top-11 w-40 overflow-hidden rounded-xl border border-border bg-surface py-1 shadow-xl">
          <button type="button" onClick={() => (setOpen(false), setName(title), setRenaming(true))} className="block w-full px-4 py-2.5 text-start text-sm hover:bg-bg">
            ✎ שינוי שם
          </button>
          <button type="button" onClick={remove} className="block w-full px-4 py-2.5 text-start text-sm text-danger hover:bg-danger/10">
            🗑 מחיקת הערכה
          </button>
        </div>
      )}
      {renaming && (
        <div role="dialog" aria-modal aria-label="שינוי שם הערכה" className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={() => setRenaming(false)}>
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => (e.preventDefault(), void rename())}
            className="w-full max-w-sm space-y-3 rounded-2xl border border-border bg-surface p-5 text-start"
          >
            <label className="block space-y-1.5">
              <span className="text-sm font-bold">שם הערכה</span>
              <input
                autoFocus
                onFocus={(e) => e.target.select()}
                value={name}
                maxLength={80}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Escape" && setRenaming(false)}
                className="w-full rounded-xl border border-border bg-bg px-4 py-3 text-base outline-none focus:border-brand"
              />
            </label>
            {error && <p className="text-sm text-danger">{error}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setRenaming(false)} className="rounded-full px-4 py-2 text-sm font-semibold text-muted hover:text-text">
                ביטול
              </button>
              <button type="submit" disabled={busy || !name.trim()} className="rounded-full bg-brand px-5 py-2 text-sm font-bold text-white hover:bg-brand-strong disabled:opacity-50">
                {busy ? "שומר…" : "שמירה"}
              </button>
            </div>
          </form>
        </div>
      )}
      {error && !renaming && (
        <p role="alert" className="absolute left-0 top-11 w-56 rounded-xl bg-danger px-3 py-2 text-xs font-semibold text-white">
          {error}
        </p>
      )}
    </div>
  );
}
