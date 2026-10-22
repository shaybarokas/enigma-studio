"use client";

import { COST } from "@/lib/plans";
import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@/lib/kits";
import { ROLE_NAMES } from "@/lib/agent/media-names";

const MAX_IMAGES = 6;

export function Chat({
  messages,
  sending,
  uploading,
  ready,
  hasConcepts,
  generating,
  onSend,
  error,
  onGenerate,
}: {
  messages: ChatMessage[];
  sending: boolean;
  uploading: boolean;
  ready: boolean;
  hasConcepts: boolean;
  generating: boolean;
  onSend: (text: string, images: File[]) => void;
  error?: string;
  onGenerate: () => void;
}) {
  const [draft, setDraft] = useState("");
  // Images waiting to go with the next message, with local previews.
  const [pending, setPending] = useState<{ file: File; url: string }[]>([]);
  const addFiles = (files: Iterable<File>) => {
    const images = [...files].filter((f) => f.type.startsWith("image/"));
    setPending((p) => [...p, ...images.map((file) => ({ file, url: URL.createObjectURL(file) }))].slice(0, MAX_IMAGES));
  };
  const end = useRef<HTMLDivElement>(null);
  const file = useRef<HTMLInputElement>(null);
  const firstScroll = useRef(true);
  useEffect(() => {
    // Jump to the latest message on open, glide on new ones.
    end.current?.scrollIntoView({ behavior: firstScroll.current ? "instant" : "smooth", block: "end" });
    firstScroll.current = false;
  }, [messages.length, sending]);

  const submit = (text: string) => {
    if ((!text.trim() && !pending.length) || sending || uploading) return;
    onSend(text.trim(), pending.map((p) => p.file));
    setDraft("");
    setPending([]);
  };
  const last = messages.at(-1);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto p-4" aria-live="polite">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-start" : "justify-end"}`}>
            <div
              className={`max-w-[88%] whitespace-pre-line rounded-2xl px-4 py-3 text-[15px] leading-relaxed ${
                m.role === "user" ? "rounded-br-md bg-brand text-white" : "rounded-bl-md border border-border bg-surface"
              }`}
            >
              {m.images && m.images.length > 0 && (
                <div className={`flex flex-wrap gap-2 ${m.text ? "mb-2" : ""}`}>
                  {m.images.map((img, k) => (
                    <figure key={k} className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element -- user uploads from storage */}
                      <img src={img.url} alt={ROLE_NAMES[img.role]} className="size-20 rounded-xl bg-white/20 object-cover" />
                      <figcaption className="absolute bottom-1 start-1 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-bold text-white">{ROLE_NAMES[img.role]}</figcaption>
                    </figure>
                  ))}
                </div>
              )}
              {m.text}
            </div>
          </div>
        ))}
        {error && !sending && (
          <p role="alert" className="rounded-2xl bg-danger/10 p-3 text-sm font-semibold text-danger">
            {error}
          </p>
        )}
        {sending && (
          <div className="flex justify-end">
            <div className="flex items-center gap-1 rounded-2xl rounded-bl-md border border-border bg-surface px-4 py-4" aria-label={uploading ? "מעבד את התמונות" : "הסוכן כותב"}>
              {uploading && <span className="me-2 text-sm text-muted">מעבד את התמונות, כחצי דקה…</span>}
              {[0, 1, 2].map((d) => (
                <span key={d} className="size-2 animate-bounce rounded-full bg-brand" style={{ animationDelay: `${d * 120}ms` }} />
              ))}
            </div>
          </div>
        )}
        {!sending && last?.role === "assistant" && (last.quickReplies?.length ?? 0) > 0 && (
          <div className="flex flex-wrap justify-end gap-2">
            {last.quickReplies!.map((q) => (
              <button
                key={q}
                onClick={() => submit(q)}
                className="rounded-full border border-brand/40 bg-brand/5 px-3 py-1.5 text-sm font-semibold text-brand transition hover:bg-brand/15"
              >
                {q}
              </button>
            ))}
          </div>
        )}
        {ready && !hasConcepts && !generating && (
          <div className="rounded-2xl border border-brand/30 bg-gradient-to-l from-brand/10 to-neon/10 p-4 text-center">
            <p className="mb-3 text-sm font-semibold">יש לי מספיק כדי להתחיל לעצב ✦</p>
            <button onClick={onGenerate} className="rounded-full bg-brand px-5 py-2.5 font-bold text-white shadow-lg shadow-brand/30 hover:bg-brand-strong">
              צרו לי 3 כיוונים
            </button>
            <p className="mt-2 text-xs text-muted">{COST.concepts} קרדיטים</p>
          </div>
        )}
        <div ref={end} />
      </div>

      {pending.length > 0 && (
        <div className="flex flex-wrap gap-2 border-t border-border bg-bg px-3 pt-3" aria-label="תמונות שיישלחו">
          {pending.map((p, i) => (
            <div key={p.url} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element -- local preview */}
              <img src={p.url} alt="" className="size-16 rounded-xl border border-border object-cover" />
              <button
                type="button"
                onClick={() => setPending((all) => all.filter((_, k) => k !== i))}
                aria-label="הסרת התמונה"
                className="absolute -top-2 -start-2 flex size-6 items-center justify-center rounded-full bg-text text-xs font-bold text-bg"
              >
                ✕
              </button>
            </div>
          ))}
          <p className="self-center text-xs text-muted">הסוכן יזהה לבד מה כל תמונה: מרצה, לוגו, מוצר או השראה</p>
        </div>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(draft);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          addFiles(e.dataTransfer.files);
        }}
        className="flex items-end gap-2 border-t border-border bg-bg p-3"
      >
        <input
          ref={file}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => file.current?.click()}
          disabled={uploading || pending.length >= MAX_IMAGES}
          title="העלאת תמונות: המרצה, לוגו, מוצר או השראה"
          aria-label="העלאת תמונות"
          className="flex size-11 shrink-0 items-center justify-center rounded-full border border-border text-xl text-muted transition hover:border-brand hover:text-brand disabled:opacity-50"
        >
          {uploading ? "…" : "📷"}
        </button>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onPaste={(e) => {
            const images = [...e.clipboardData.files].filter((f) => f.type.startsWith("image/"));
            if (images.length) {
              e.preventDefault();
              addFiles(images);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit(draft);
            }
          }}
          rows={1}
          placeholder={pending.length ? "אפשר להוסיף מילה על התמונות…" : "כתבו לסוכן, הדביקו קישור או צרפו תמונות…"}
          aria-label="הודעה לסוכן"
          className="max-h-40 min-h-11 flex-1 resize-none rounded-2xl border border-border bg-surface px-4 py-2.5 text-[15px] outline-none transition focus:border-brand"
        />
        <button
          type="submit"
          disabled={sending || uploading || (!draft.trim() && !pending.length)}
          aria-label="שליחה"
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand text-white transition hover:bg-brand-strong disabled:opacity-40"
        >
          <svg viewBox="0 0 24 24" className="size-5 -scale-x-100" fill="currentColor" aria-hidden>
            <path d="M3.4 20.4 21 12 3.4 3.6l.01 6.53L15 12 3.41 13.87z" />
          </svg>
        </button>
      </form>
    </div>
  );
}
