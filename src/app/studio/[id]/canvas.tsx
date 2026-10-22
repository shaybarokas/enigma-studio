"use client";

import { useEffect, useRef, useState } from "react";
import { DesignPlayer, DesignThumb } from "@/components/design-preview-lazy";
import { FORMATS, FORMAT_IDS, type FormatId } from "@/engine/formats";
import type { TemplateId } from "@/engine/templates";
import type { DesignProps } from "@/engine/design";
import type { Brief } from "@/lib/agent/brief";
import type { Kit } from "@/lib/kits";
import { Editor } from "./editor";
import { Videos } from "./videos";
import { Paywalled, paywalled, refreshAccount, showUpgrade, useAccount } from "@/components/account";
import { COST, kitFeatures } from "@/lib/plans";

type Props = {
  kit: Kit;
  generating: boolean;
  uploading: boolean;
  onGenerate: () => void;
  onUpload: (f: File) => void;
  onChoose: (i: number) => void;
  onReopenConcepts: () => void;
  onDesignChange: (d: DesignProps) => void;
};

export function Canvas(p: Props) {
  if (p.generating) return <Generating />;
  if (p.kit.status === "ready" && p.kit.design && p.kit.chosen != null && p.kit.concepts)
    return (
      <Gallery
        kitId={p.kit.id}
        design={p.kit.design}
        cover={p.kit.concepts[p.kit.chosen].concept.templateId as TemplateId}
        name={p.kit.concepts[p.kit.chosen].concept.name}
        unlocked={p.kit.unlocked}
        onReopen={p.onReopenConcepts}
        onDesignChange={p.onDesignChange}
      />
    );
  if (p.kit.concepts) return <Concepts kit={p.kit} onChoose={p.onChoose} onRegenerate={p.onGenerate} />;
  return <BriefView {...p} />;
}

// ── Before concepts: what the agent understood so far, the lecturer photo, and the go button. ──

const BRIEF_LABELS: [keyof Brief, string][] = [
  ["title", "מה משיקים"],
  ["audience", "למי"],
  ["pain", "הכאב"],
  ["promise", "ההבטחה"],
  ["uniqueness", "מה מייחד"],
  ["tone", "טון"],
  ["price", "מחיר"],
  ["visualNotes", "טעם עיצובי"],
];

function BriefView({ kit, uploading, onUpload, onGenerate }: Props) {
  const b = kit.brief;
  const filled = BRIEF_LABELS.filter(([k]) => b?.[k]).length;
  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 lg:p-8">
      <div>
        <h1 className="text-2xl font-black">{kit.title}</h1>
        <p className="mt-1 text-muted">ככל שהסוכן מבין יותר, הבריף מתמלא כאן. כשהוא מוכן, יוצרים את הכיוונים.</p>
      </div>

      <div className="rounded-3xl border border-border bg-surface p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-bold">הבריף</h2>
          <span className="text-sm text-muted">
            {filled}/{BRIEF_LABELS.length}
          </span>
        </div>
        <div className="mb-5 h-1.5 overflow-hidden rounded-full bg-border">
          <div className="h-full rounded-full bg-gradient-to-l from-brand to-neon transition-all duration-700" style={{ width: `${(filled / BRIEF_LABELS.length) * 100}%` }} />
        </div>
        <dl className="grid gap-3 sm:grid-cols-2">
          {BRIEF_LABELS.map(([k, label]) => (
            <div key={k} className={`rounded-2xl p-3 transition ${b?.[k] ? "bg-brand/5" : "border border-dashed border-border"}`}>
              <dt className="text-xs font-bold text-muted">{label}</dt>
              <dd className="mt-1 text-sm">{(b?.[k] as string) || <span className="text-muted/60">עוד לא</span>}</dd>
            </div>
          ))}
        </dl>
      </div>

      <PhotoCard subject={kit.subject} uploading={uploading} onUpload={onUpload} />

      <div className="flex flex-col items-center gap-2 pb-8">
        <button
          onClick={onGenerate}
          disabled={!kit.ready}
          className="rounded-full bg-brand px-8 py-4 text-lg font-bold text-white shadow-xl shadow-brand/30 transition hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
        >
          ✦ צרו לי 3 כיוונים
        </button>
        {kit.ready ? (
          <p className="text-sm text-muted">{COST.concepts} קרדיטים, כולל תמונות ותפאורות שנוצרות במיוחד</p>
        ) : (
          <p className="text-sm text-muted">עוד כמה תשובות לסוכן, ואפשר להתחיל.</p>
        )}
      </div>
    </div>
  );
}

function PhotoCard({ subject, uploading, onUpload }: { subject: Kit["subject"]; uploading: boolean; onUpload: (f: File) => void }) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className="flex items-center gap-4 rounded-3xl border border-border bg-surface p-5">
      <div className="flex size-24 shrink-0 items-end justify-center overflow-hidden rounded-2xl bg-gradient-to-b from-brand/20 to-neon/10">
        {subject ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={subject.src} alt="המרצה, חתוך מהרקע" className="max-h-full max-w-full object-contain" />
        ) : (
          <span className="mb-6 text-3xl" aria-hidden>
            👤
          </span>
        )}
      </div>
      <div className="flex-1">
        <h2 className="font-bold">תמונת המרצה</h2>
        <p className="mt-1 text-sm text-muted">
          תמונה ברורה, פלג גוף עליון, תאורה טובה. אנחנו חותכים את הרקע ומשלבים אותך בכל עיצוב.
        </p>
        <input
          ref={input}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onUpload(f);
            e.target.value = "";
          }}
        />
        <button
          onClick={() => input.current?.click()}
          disabled={uploading}
          className="mt-3 rounded-full border border-brand px-4 py-2 text-sm font-bold text-brand transition hover:bg-brand/10 disabled:opacity-50"
        >
          {uploading ? "חותך את הרקע…" : subject ? "החלפת תמונה" : "העלאת תמונה"}
        </button>
      </div>
    </div>
  );
}

// ── While the three directions are being made. ──

const STEPS = [
  "קורא את הבריף ומחפש את הזווית החזקה…",
  "בונה שלושה כיוונים שונים לגמרי…",
  "בוחר צבעים ופונטים לכל כיוון…",
  "כותב כותרות שעוצרות גלילה…",
  "מצלם סצנות רקע ב־AI…",
  "מעצב אביזרים בתלת־ממד…",
  "מלטש את הפרטים האחרונים…",
];

function Generating() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((x) => Math.min(x + 1, STEPS.length - 1)), 14000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-8 p-8 text-center">
      <div className="relative size-28" aria-hidden>
        <div className="absolute inset-0 animate-spin rounded-full border-4 border-brand/20 border-t-brand" style={{ animationDuration: "1.4s" }} />
        <div className="glow absolute inset-4 rounded-full bg-gradient-to-br from-brand to-neon blur-md" />
      </div>
      <div aria-live="polite">
        <p className="text-xl font-bold">{STEPS[i]}</p>
        <p className="mt-2 text-sm text-muted">זה לוקח בערך שתי דקות. שווה לחכות.</p>
      </div>
    </div>
  );
}

// ── The three directions. ──

function FormatSwitch({ value, onChange }: { value: FormatId; onChange: (f: FormatId) => void }) {
  return (
    <div className="inline-flex rounded-full border border-border bg-surface p-1" role="radiogroup" aria-label="גודל התצוגה">
      {FORMAT_IDS.map((f) => (
        <button
          key={f}
          role="radio"
          aria-checked={value === f}
          onClick={() => onChange(f)}
          className={`rounded-full px-3 py-1.5 text-sm font-bold transition ${value === f ? "bg-brand text-white" : "text-muted hover:text-text"}`}
        >
          <span dir="ltr">{FORMATS[f].label}</span>
        </button>
      ))}
    </div>
  );
}

function Concepts({ kit, onChoose, onRegenerate }: { kit: Kit; onChoose: (i: number) => void; onRegenerate: () => void }) {
  const [format, setFormat] = useState<FormatId>("landscape");
  const [live, setLive] = useState<number | null>(null);
  const [choosing, setChoosing] = useState<number | null>(null);
  const concepts = kit.concepts!;
  const tall = format === "portrait" || format === "story";
  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 lg:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black">שלושה כיוונים ל{kit.title}</h1>
          <p className="mt-1 text-muted">בוחרים כיוון, וממנו נבנית כל הערכה. אפשר לשנות כל פרט אחר כך.</p>
        </div>
        <FormatSwitch value={format} onChange={setFormat} />
      </div>
      <ul className={`grid gap-6 ${tall ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-1 xl:grid-cols-3"}`}>
        {concepts.map((c, i) => (
          <li key={i} className="flex flex-col overflow-hidden rounded-3xl border border-border bg-surface">
            <button onClick={() => setLive(i)} className="group relative block" aria-label={`תצוגה חיה של ${c.concept.name}`}>
              <DesignThumb design={c.design} template={c.concept.templateId as TemplateId} format={format} />
              <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-white opacity-0 transition group-hover:bg-black/30 group-hover:opacity-100">
                <span className="rounded-full bg-black/60 px-4 py-2 text-sm font-bold">▶ תצוגה חיה</span>
              </span>
            </button>
            <div className="flex flex-1 flex-col gap-3 p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-black">{c.concept.name}</h2>
                <div className="flex gap-1" aria-hidden>
                  {Object.values(c.design.brand.palette).map((col) => (
                    <span key={col} className="size-4 rounded-full border border-black/10" style={{ background: col }} />
                  ))}
                </div>
              </div>
              <p className="flex-1 text-sm leading-relaxed text-muted">{c.concept.idea}</p>
              <button
                onClick={async () => {
                  setChoosing(i);
                  await onChoose(i);
                  setChoosing(null);
                }}
                disabled={choosing !== null}
                className="rounded-full bg-brand px-5 py-3 font-bold text-white transition hover:bg-brand-strong disabled:opacity-60"
              >
                {choosing === i ? "בונה את הערכה…" : kit.chosen === i ? "✓ הכיוון שנבחר. חזרה לערכה" : "בוחרים בכיוון הזה"}
              </button>
            </div>
          </li>
        ))}
      </ul>
      <div className="text-center">
        <button onClick={onRegenerate} className="text-sm font-semibold text-muted underline-offset-4 hover:text-brand hover:underline">
          אף כיוון לא מדויק? יצירת שלושה חדשים
        </button>
      </div>
      {live !== null && (
        <LiveView
          design={concepts[live].design}
          template={concepts[live].concept.templateId as TemplateId}
          initialFormat={format}
          title={concepts[live].concept.name}
          onClose={() => setLive(null)}
        />
      )}
    </div>
  );
}

// ── The kit: every output of the chosen direction. ──

// Full-resolution files are rendered on the server; the browser then downloads the result.
async function requestExport(kitId: string, body: object): Promise<{ files: { url: string }[]; zipUrl?: string }> {
  const res = await fetch(`/api/kits/${kitId}/export`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (paywalled(res, data)) throw new Paywalled();
  if (!res.ok) throw new Error(data.error ?? "ההורדה לא הצליחה");
  return data;
}

function DownloadButton({ label, busyLabel, run, className, locked }: { label: string; busyLabel: string; run: () => Promise<string>; className: string; locked?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <span className="inline-flex flex-col items-center gap-1">
      <button
        disabled={busy}
        className={className}
        onClick={async () => {
          if (locked) return showUpgrade(locked);
          setBusy(true);
          setError("");
          try {
            window.location.href = await run();
          } catch (e) {
            if (!(e instanceof Paywalled)) setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? busyLabel : label}
      </button>
      {error && <span className="text-xs text-danger">{error}</span>}
    </span>
  );
}

function GiftBanner({ kitId, onUnlocked }: { kitId: string; onUnlocked: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const unlock = async () => {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/kits/${kitId}/unlock`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(data.error ?? "משהו השתבש");
    refreshAccount();
    onUnlocked();
  };
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-brand/40 bg-gradient-to-l from-brand/15 to-neon/10 p-5">
      <div>
        <p className="font-black">🎁 יש לך ערכה מלאה במתנה</p>
        <p className="text-sm text-muted">כל 4 הגדלים בלי חותמת, הורדת ZIP וסרטונים, לערכה הזו. המתנה נצרכת פעם אחת.</p>
        {error && <p className="mt-1 text-sm text-danger">{error}</p>}
      </div>
      <button onClick={unlock} disabled={busy} className="rounded-full bg-brand px-5 py-2.5 font-bold text-white shadow-lg shadow-brand/30 hover:bg-brand-strong disabled:opacity-60">
        {busy ? "פותח…" : "לפתוח את הערכה הזו"}
      </button>
    </div>
  );
}

function Gallery({
  kitId,
  design,
  cover,
  name,
  unlocked: initiallyUnlocked,
  onReopen,
  onDesignChange,
}: {
  kitId: string;
  design: DesignProps;
  cover: TemplateId;
  name: string;
  unlocked: boolean;
  onReopen: () => void;
  onDesignChange: (d: DesignProps) => void;
}) {
  const [live, setLive] = useState<{ template: TemplateId; format: FormatId } | null>(null);
  const [editing, setEditing] = useState<{ template: TemplateId; format: FormatId } | null>(null);
  const sections: { title: string; note: string; template: TemplateId }[] = [
    { title: "גרפיקת תצוגה", note: "לעמוד הקורס, לדף המכירה ולתמונה הממוזערת", template: cover },
    { title: "מודעת הוק", note: "פותחת בכאב ועוצרת את הגלילה", template: "ad-hook" },
    { title: "מודעת מה בקורס", note: "התוצאות, המחיר והנעה לפעולה", template: "ad-list" },
  ];
  const account = useAccount();
  const [unlocked, setUnlocked] = useState(initiallyUnlocked);
  const plan = kitFeatures(account?.plan ?? "free", unlocked);
  // What the downloads will look like: the free plan's files carry the watermark.
  const shown = plan.watermark ? { ...design, watermark: true } : design;
  return (
    <div className="mx-auto max-w-7xl space-y-10 p-4 lg:p-8">
      {account?.plan === "free" && !unlocked && account.kitPasses > 0 && <GiftBanner kitId={kitId} onUnlocked={() => setUnlocked(true)} />}
      {account?.plan === "free" && unlocked && (
        <p className="rounded-2xl bg-brand/10 p-3 text-center text-sm font-semibold text-brand">🎁 ערכה מלאה במתנה: כל הגדלים, בלי חותמת, ZIP וסרטונים, לערכה הזו.</p>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-brand">הכיוון: {name}</p>
          <h1 className="text-2xl font-black">ערכת ההשקה שלך</h1>
        </div>
        <div className="flex flex-wrap items-start gap-2">
          <button onClick={onReopen} className="rounded-full border border-border px-4 py-2.5 text-sm font-bold transition hover:border-brand hover:text-brand">
            החלפת כיוון
          </button>
          <button
            onClick={() => setEditing({ template: cover, format: "landscape" })}
            className="rounded-full border border-brand px-4 py-2.5 text-sm font-bold text-brand transition hover:bg-brand/10"
          >
            ✎ עריכת העיצוב
          </button>
          <DownloadButton
            label={plan.zip ? "⬇ הורדת כל הערכה (ZIP)" : "🔒 הורדת כל הערכה (ZIP)"}
            locked={plan.zip ? undefined : "הורדת כל הערכה בקובץ אחד כלולה במסלולים בתשלום."}
            busyLabel="מפיק 12 קבצים בגודל מלא… (כדקה)"
            run={async () => (await requestExport(kitId, { all: true })).zipUrl!}
            className="rounded-full bg-brand px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-brand/30 transition hover:bg-brand-strong disabled:opacity-70"
          />
        </div>
      </div>
      {sections.map((s) => (
        <section key={s.template}>
          <div className="mb-4">
            <h2 className="text-xl font-black">{s.title}</h2>
            <p className="text-sm text-muted">{s.note}</p>
          </div>
          <ul className="grid grid-cols-2 items-end gap-4 md:grid-cols-[2.2fr_1fr_0.85fr_0.62fr]">
            {FORMAT_IDS.map((f) => (
              <li key={f} className={f === "landscape" ? "col-span-2 md:col-span-1" : ""}>
                <button
                  onClick={() => setLive({ template: s.template, format: f })}
                  className="group block w-full overflow-hidden rounded-2xl border border-border transition hover:border-brand hover:shadow-xl hover:shadow-brand/10"
                  aria-label={`${s.title}, ${FORMATS[f].name}: תצוגה חיה`}
                >
                  <DesignThumb design={shown} template={s.template} format={f} />
                </button>
                <p className="mt-2 text-center text-xs font-semibold text-muted">
                  {!plan.formats.includes(f) && <span title="כלול במסלולים בתשלום">🔒 </span>}
                  {FORMATS[f].name} · <span dir="ltr">{FORMATS[f].label}</span>
                </p>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <Videos kitId={kitId} unlocked={unlocked} />
      {live && (
        <LiveView
          kitId={kitId}
          plan={plan}
          design={shown}
          template={live.template}
          initialFormat={live.format}
          title={sections.find((s) => s.template === live.template)?.title ?? ""}
          onClose={() => setLive(null)}
          onEdit={(template, format) => {
            setLive(null);
            setEditing({ template, format });
          }}
        />
      )}
      {editing && (
        <Editor
          kitId={kitId}
          design={design}
          templates={sections.map((s) => s.template)}
          initialTemplate={editing.template}
          initialFormat={editing.format}
          onChange={onDesignChange}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function LiveView({
  kitId,
  design,
  template,
  initialFormat,
  title,
  onClose,
  onEdit,
  plan,
}: {
  kitId?: string;
  plan?: ReturnType<typeof kitFeatures>; // with kitId: what downloads this kit may do
  onEdit?: (template: TemplateId, format: FormatId) => void;
  design: DesignProps;
  template: TemplateId;
  initialFormat: FormatId;
  title: string;
  onClose: () => void;
}) {
  const [format, setFormat] = useState(initialFormat);
  const tall = format === "portrait" || format === "story";
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div role="dialog" aria-modal aria-label={title} className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur" onClick={onClose}>
      <div className="flex max-h-full w-full max-w-5xl flex-col items-center gap-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex w-full items-center justify-between gap-3 text-white">
          <h2 className="text-lg font-bold">{title}</h2>
          <div className="flex flex-wrap items-center gap-3">
            {onEdit && (
              <button onClick={() => onEdit(template, format)} className="rounded-full border border-white/40 px-4 py-2 text-sm font-bold text-white hover:bg-white/10">
                ✎ עריכה
              </button>
            )}
            {kitId && plan && (
              <DownloadButton
                key={`${template}-${format}`}
                label={plan.formats.includes(format) ? "⬇ הורדה בגודל מלא" : "🔒 הורדה בגודל מלא"}
                locked={plan.formats.includes(format) ? undefined : "במסלול החינמי אפשר להוריד בריבוע ובסטורי. שאר הגדלים כלולים במסלולים בתשלום."}
                busyLabel="מפיק…"
                run={async () => (await requestExport(kitId, { items: [{ template, format }] })).files[0].url}
                className="rounded-full bg-white px-4 py-2 text-sm font-bold text-black transition hover:bg-white/85 disabled:opacity-70"
              />
            )}
            <FormatSwitch value={format} onChange={setFormat} />
            <button onClick={onClose} aria-label="סגירה" className="flex size-10 items-center justify-center rounded-full bg-white/10 text-xl hover:bg-white/20">
              ✕
            </button>
          </div>
        </div>
        <div className={tall ? "w-full max-w-[min(100%,42vh)]" : "w-full"}>
          <DesignPlayer design={design} template={template} format={format} />
        </div>
      </div>
    </div>
  );
}
