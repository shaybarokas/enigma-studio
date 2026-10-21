"use client";

// The editor: the design on a stage where elements are clicked and dragged, and a panel for the
// texts, colours, fonts and the selected element. Every change shows at once and autosaves.
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { DesignThumb } from "@/components/design-preview-lazy";
import { ELEMENT_NAMES, overrideKey, splitHeadline, type DesignProps } from "@/engine/design";
import { FONT_NAMES } from "@/engine/fonts-list";
import { FORMATS, FORMAT_IDS, type FormatId } from "@/engine/formats";
import { CATALOG, type TemplateId } from "@/engine/catalog";
import type { Transform } from "@/engine/types";

type Props = {
  kitId: string;
  design: DesignProps;
  templates: TemplateId[];
  initialTemplate: TemplateId;
  initialFormat: FormatId;
  onChange: (d: DesignProps) => void;
  onClose: () => void;
};

const HEBREW_FONTS = ["Heebo", "Rubik", "Secular One", "Suez One", "Frank Ruhl Libre"] as const;
const COLOR_LABELS: [keyof DesignProps["brand"]["palette"], string][] = [
  ["bg", "רקע"],
  ["ink", "טקסט"],
  ["muted", "טקסט משני"],
  ["accent", "צבע הדגשה"],
];

export function Editor({ kitId, design: initial, templates, initialTemplate, initialFormat, onChange, onClose }: Props) {
  const [design, setDesign] = useState(initial);
  const [past, setPast] = useState<DesignProps[]>([]);
  const [future, setFuture] = useState<DesignProps[]>([]);
  const [template, setTemplate] = useState(initialTemplate);
  const [format, setFormat] = useState(initialFormat);
  const [selected, setSelected] = useState<string | null>(null);
  const [saved, setSaved] = useState<"saved" | "saving" | "error">("saved");

  // Autosave, 700ms after the last change. The parent's callback lives in a ref: it changes on
  // every parent render, and as a dependency it would re-trigger the save it reports.
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  const lastSaved = useRef(initial);
  useEffect(() => {
    if (design === lastSaved.current) return;
    setSaved("saving");
    const t = setTimeout(async () => {
      const res = await fetch(`/api/kits/${kitId}/design`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ design }),
      }).catch(() => null);
      setSaved(res?.ok ? "saved" : "error");
      if (res?.ok) {
        lastSaved.current = design;
        onChangeRef.current(design);
      }
    }, 700);
    return () => clearTimeout(t);
  }, [design, kitId]);

  const update = useCallback((next: DesignProps | ((d: DesignProps) => DesignProps), record = true) => {
    setDesign((d) => {
      const n = typeof next === "function" ? next(d) : next;
      if (record) {
        setPast((p) => [...p.slice(-49), d]);
        setFuture([]);
      }
      return n;
    });
  }, []);
  const undo = () => {
    const prev = past.at(-1);
    if (!prev) return;
    setPast((p) => p.slice(0, -1));
    setFuture((f) => [design, ...f]);
    setDesign(prev);
  };
  const redo = () => {
    const next = future[0];
    if (!next) return;
    setFuture((f) => f.slice(1));
    setPast((p) => [...p, design]);
    setDesign(next);
  };

  const key = (el: string) => overrideKey(template, format, el);
  const transformOf = (el: string): Partial<Transform> => design.overrides[key(el)] ?? {};
  const setTransform = (el: string, t: Partial<Transform>, record = true) =>
    update((d) => ({ ...d, overrides: { ...d.overrides, [key(el)]: { ...d.overrides[key(el)], ...t } } }), record);
  const resetTransform = (el: string) =>
    update((d) => {
      const o = { ...d.overrides };
      delete o[key(el)];
      return { ...d, overrides: o };
    });
  const hiddenHere = Object.entries(design.overrides)
    .filter(([k, t]) => k.startsWith(`${template}|${format}|`) && t.hidden)
    .map(([k]) => k.split("|")[2]);

  const copy = design.copy;
  const setCopy = (patch: Partial<DesignProps["copy"]>) => update((d) => ({ ...d, copy: { ...d.copy, ...patch } }));
  const [h1, h2] = splitHeadline(copy.headline);

  return (
    <div role="dialog" aria-modal aria-label="עורך העיצוב" className="fixed inset-0 z-50 flex flex-col bg-bg">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-2.5">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="rounded-full bg-brand px-4 py-2 text-sm font-bold text-white hover:bg-brand-strong">
            ✓ סיום
          </button>
          <span className="text-sm text-muted" aria-live="polite">
            {saved === "saving" ? "שומר…" : saved === "error" ? "השמירה נכשלה, ננסה שוב בשינוי הבא" : "נשמר ✓"}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={undo} disabled={!past.length} className="rounded-full border border-border px-3 py-1.5 text-sm font-bold disabled:opacity-40" aria-label="ביטול">
            ↶ ביטול
          </button>
          <button onClick={redo} disabled={!future.length} className="rounded-full border border-border px-3 py-1.5 text-sm font-bold disabled:opacity-40" aria-label="חזרה">
            ↷ חזרה
          </button>
          <Segmented
            label="תוצר"
            value={template}
            options={templates.map((t) => [t, CATALOG[t].kind === "cover" ? "גרפיקת תצוגה" : CATALOG[t].name])}
            onChange={(t) => {
              setTemplate(t as TemplateId);
              setSelected(null);
            }}
          />
          <Segmented
            label="גודל"
            value={format}
            options={FORMAT_IDS.map((f) => [f, FORMATS[f].label])}
            onChange={(f) => {
              setFormat(f as FormatId);
              setSelected(null);
            }}
            ltr
          />
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <Stage
          design={design}
          template={template}
          format={format}
          selected={selected}
          onSelect={setSelected}
          transformOf={transformOf}
          onMove={(el, t, record) => setTransform(el, t, record)}
        />

        <aside className="w-full shrink-0 space-y-6 overflow-y-auto border-border p-4 lg:w-[380px] lg:border-r">
          {selected ? (
            <Section title={`נבחר: ${ELEMENT_NAMES[selected] ?? selected}`}>
              <p className="text-xs text-muted">גוררים על הבמה כדי להזיז. השינוי חל רק על התוצר והגודל האלה.</p>
              <Slider label="גודל" min={0.4} max={2.2} step={0.01} value={transformOf(selected).scale ?? 1} onChange={(v) => setTransform(selected, { scale: v })} format={(v) => `${Math.round(v * 100)}%`} />
              <Slider label="סיבוב" min={-20} max={20} step={0.5} value={transformOf(selected).rotate ?? 0} onChange={(v) => setTransform(selected, { rotate: v })} format={(v) => `${v}°`} />
              <div className="flex gap-2">
                <button onClick={() => { setTransform(selected, { hidden: true }); setSelected(null); }} className="flex-1 rounded-full border border-border px-3 py-2 text-sm font-bold hover:border-danger hover:text-danger">
                  הסתרה
                </button>
                <button onClick={() => resetTransform(selected)} className="flex-1 rounded-full border border-border px-3 py-2 text-sm font-bold hover:border-brand hover:text-brand">
                  איפוס
                </button>
              </div>
            </Section>
          ) : (
            <p className="rounded-2xl bg-brand/5 p-3 text-sm text-muted">לחיצה על אלמנט בעיצוב בוחרת אותו: אפשר לגרור, להגדיל, לסובב או להסתיר.</p>
          )}

          {hiddenHere.length > 0 && (
            <Section title="מוסתרים כאן">
              <div className="flex flex-wrap gap-2">
                {hiddenHere.map((el) => (
                  <button key={el} onClick={() => setTransform(el, { hidden: false })} className="rounded-full border border-border px-3 py-1.5 text-sm hover:border-brand">
                    👁 {ELEMENT_NAMES[el] ?? el}
                  </button>
                ))}
              </div>
            </Section>
          )}

          <Section title="טקסטים" note="משתנים בכל התוצרים">
            <Field label="שם המותג (שורה בכל שורה)" value={copy.wordmark.join("\n")} rows={2} ltr onChange={(v) => setCopy({ wordmark: v.split("\n").slice(0, 3) })} />
            <Field label="שורת פתיחה קטנה" value={copy.kicker} onChange={(v) => setCopy({ kicker: v })} />
            <Field label="כותרת: החלק הרגיל" value={h1} onChange={(v) => setCopy({ headline: h2 ? `${v}|${h2}` : v })} />
            <Field label="כותרת: החלק המודגש בצבע" value={h2} onChange={(v) => setCopy({ headline: v ? `${h1}|${v}` : h1 })} />
            <Field label="ההבטחה" value={copy.subtitle} rows={2} onChange={(v) => setCopy({ subtitle: v })} />
            <Field label="מה בקורס (שורה לכל נקודה)" value={copy.bullets.join("\n")} rows={4} onChange={(v) => setCopy({ bullets: v.split("\n").slice(0, 6) })} />
            <Field label="תגיות (שורה לכל תגית)" value={copy.tags.join("\n")} rows={2} onChange={(v) => setCopy({ tags: v.split("\n").slice(0, 3) })} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="כפתור" value={copy.cta} onChange={(v) => setCopy({ cta: v })} />
              <Field label="מחיר" value={copy.price ?? ""} onChange={(v) => setCopy({ price: v || undefined })} />
            </div>
          </Section>

          <Section title="צבעים" note="משתנים בכל התוצרים">
            <div className="grid grid-cols-2 gap-3">
              {COLOR_LABELS.map(([k, label]) => (
                <label key={k} className="flex items-center gap-2 rounded-xl border border-border p-2">
                  <input
                    type="color"
                    value={design.brand.palette[k]}
                    onChange={(e) => update((d) => ({ ...d, brand: { ...d.brand, palette: { ...d.brand.palette, [k]: e.target.value } } }))}
                    className="size-9 cursor-pointer rounded-lg border-0 bg-transparent"
                  />
                  <span className="text-sm font-semibold">{label}</span>
                </label>
              ))}
            </div>
          </Section>

          <Section title="גופנים">
            <Select label="שם המותג" value={design.brand.displayFont} options={FONT_NAMES} onChange={(v) => update((d) => ({ ...d, brand: { ...d.brand, displayFont: v as never } }))} />
            <Select label="כותרות בעברית" value={design.brand.headlineFont} options={HEBREW_FONTS} onChange={(v) => update((d) => ({ ...d, brand: { ...d.brand, headlineFont: v as never } }))} />
            <Select label="טקסט רץ" value={design.brand.bodyFont} options={HEBREW_FONTS} onChange={(v) => update((d) => ({ ...d, brand: { ...d.brand, bodyFont: v as never } }))} />
          </Section>

          <Section title="המרצה">
            <Segmented
              label="צד"
              value={design.subjectSide}
              options={[["right", "ימין"], ["left", "שמאל"]]}
              onChange={(v) => update((d) => ({ ...d, subjectSide: v as "left" | "right" }))}
            />
          </Section>
        </aside>
      </div>
    </div>
  );
}

// ── The stage: the live design, with click-to-select and drag-to-move on top. ──

function Stage({
  design,
  template,
  format,
  selected,
  onSelect,
  transformOf,
  onMove,
}: {
  design: DesignProps;
  template: TemplateId;
  format: FormatId;
  selected: string | null;
  onSelect: (el: string | null) => void;
  transformOf: (el: string) => Partial<Transform>;
  onMove: (el: string, t: Partial<Transform>, record: boolean) => void;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const drag = useRef<{ el: string; x: number; y: number; ox: number; oy: number; moved: boolean } | null>(null);
  const f = FORMATS[format];

  // Fit the stage to the available space at the format's aspect ratio.
  useLayoutEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const fit = () => {
      const r = el.getBoundingClientRect();
      const scale = Math.min((r.width - 32) / f.width, (r.height - 32) / f.height);
      setSize({ w: f.width * scale, h: f.height * scale });
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [f.width, f.height]);

  // Keep the selection outline on the element as it renders, moves and animates in.
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const s = stage.current;
      const target = selected ? s?.querySelector<HTMLElement>(`[data-el="${selected}"]`) : null;
      if (s && target) {
        const a = s.getBoundingClientRect();
        const b = target.getBoundingClientRect();
        setBox((prev) => {
          const next = { left: b.left - a.left, top: b.top - a.top, width: b.width, height: b.height };
          return prev && Math.abs(prev.left - next.left) + Math.abs(prev.top - next.top) + Math.abs(prev.width - next.width) < 0.5 ? prev : next;
        });
      } else setBox(null);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [selected]);

  const scale = size.w / f.width;
  const pick = (x: number, y: number) =>
    (document.elementsFromPoint(x, y).find((e) => e instanceof HTMLElement && e.dataset.el && stage.current?.contains(e)) as HTMLElement | undefined)
      ?.dataset.el ?? null;

  return (
    <div ref={wrap} className="relative flex min-h-[50vh] flex-1 items-center justify-center overflow-hidden bg-[repeating-conic-gradient(var(--surface)_0%_25%,var(--bg)_0%_50%)] [background-size:24px_24px]">
      <div ref={stage} className="relative shadow-2xl" style={{ width: size.w, height: size.h }}>
        {size.w > 0 && <DesignThumb design={design} template={template} format={format} />}
        <div
          className="absolute inset-0 cursor-grab touch-none active:cursor-grabbing"
          onPointerDown={(e) => {
            const overlay = e.currentTarget;
            overlay.style.pointerEvents = "none"; // look through the overlay at the design
            const el = pick(e.clientX, e.clientY);
            overlay.style.pointerEvents = "";
            onSelect(el);
            if (!el) return;
            const t = transformOf(el);
            drag.current = { el, x: e.clientX, y: e.clientY, ox: t.x ?? 0, oy: t.y ?? 0, moved: false };
            overlay.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            const d = drag.current;
            if (!d) return;
            const dx = (e.clientX - d.x) / scale;
            const dy = (e.clientY - d.y) / scale;
            if (!d.moved && Math.hypot(dx, dy) * scale < 3) return;
            onMove(d.el, { x: Math.round(d.ox + dx), y: Math.round(d.oy + dy) }, !d.moved); // one undo step per drag
            d.moved = true;
          }}
          onPointerUp={() => {
            drag.current = null;
          }}
        />
        {box && (
          <div
            className="pointer-events-none absolute rounded-md border-2 border-neon shadow-[0_0_0_9999px_rgba(0,0,0,0.25)]"
            style={{ left: box.left - 3, top: box.top - 3, width: box.width + 6, height: box.height + 6 }}
          >
            <span className="absolute -top-7 right-0 rounded-full bg-neon px-2 py-0.5 text-xs font-bold text-black">
              {ELEMENT_NAMES[selected!] ?? selected}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Small controls. ──

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h3 className="font-black">{title}</h3>
        {note && <span className="text-xs text-muted">{note}</span>}
      </div>
      {children}
    </section>
  );
}

function Field({ label, value, onChange, rows, ltr }: { label: string; value: string; onChange: (v: string) => void; rows?: number; ltr?: boolean }) {
  const cls = "w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none transition focus:border-brand";
  return (
    <label className="block space-y-1">
      <span className="text-xs font-bold text-muted">{label}</span>
      {rows ? (
        <textarea rows={rows} value={value} dir={ltr ? "ltr" : undefined} onChange={(e) => onChange(e.target.value)} className={`${cls} resize-y`} />
      ) : (
        <input value={value} dir={ltr ? "ltr" : undefined} onChange={(e) => onChange(e.target.value)} className={cls} />
      )}
    </label>
  );
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: readonly string[]; onChange: (v: string) => void }) {
  return (
    <label className="flex items-center justify-between gap-3">
      <span className="text-sm font-semibold">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="rounded-xl border border-border bg-surface px-3 py-2 text-sm" style={{ fontFamily: value }} dir="ltr">
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

function Slider({ label, min, max, step, value, onChange, format }: { label: string; min: number; max: number; step: number; value: number; onChange: (v: number) => void; format: (v: number) => string }) {
  return (
    <label className="block space-y-1">
      <span className="flex justify-between text-sm font-semibold">
        {label} <span className="text-muted" dir="ltr">{format(value)}</span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-[var(--brand)]" />
    </label>
  );
}

function Segmented({ label, value, options, onChange, ltr }: { label: string; value: string; options: [string, string][]; onChange: (v: string) => void; ltr?: boolean }) {
  return (
    <div className="inline-flex rounded-full border border-border bg-surface p-1" role="radiogroup" aria-label={label}>
      {options.map(([v, text]) => (
        <button
          key={v}
          role="radio"
          aria-checked={value === v}
          onClick={() => onChange(v)}
          className={`rounded-full px-3 py-1 text-sm font-bold transition ${value === v ? "bg-brand text-white" : "text-muted hover:text-text"}`}
        >
          <span dir={ltr ? "ltr" : undefined}>{text}</span>
        </button>
      ))}
    </div>
  );
}
