"use client";

import { COST } from "@/lib/plans";
import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@/lib/kits";

export function Chat({
  messages,
  sending,
  uploading,
  ready,
  hasConcepts,
  generating,
  onSend,
  onUpload,
  onGenerate,
}: {
  messages: ChatMessage[];
  sending: boolean;
  uploading: boolean;
  ready: boolean;
  hasConcepts: boolean;
  generating: boolean;
  onSend: (text: string) => void;
  onUpload: (file: File) => void;
  onGenerate: () => void;
}) {
  const [draft, setDraft] = useState("");
  const end = useRef<HTMLDivElement>(null);
  const file = useRef<HTMLInputElement>(null);
  const firstScroll = useRef(true);
  useEffect(() => {
    // Jump to the latest message on open, glide on new ones.
    end.current?.scrollIntoView({ behavior: firstScroll.current ? "instant" : "smooth", block: "end" });
    firstScroll.current = false;
  }, [messages.length, sending]);

  const submit = (text: string) => {
    if (!text.trim() || sending) return;
    onSend(text.trim());
    setDraft("");
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
              {m.text}
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-end">
            <div className="flex gap-1 rounded-2xl rounded-bl-md border border-border bg-surface px-4 py-4" aria-label="הסוכן כותב">
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

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(draft);
        }}
        className="flex items-end gap-2 border-t border-border bg-bg p-3"
      >
        <input
          ref={file}
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
          type="button"
          onClick={() => file.current?.click()}
          disabled={uploading}
          title="העלאת תמונת מרצה"
          aria-label="העלאת תמונת מרצה"
          className="flex size-11 shrink-0 items-center justify-center rounded-full border border-border text-xl text-muted transition hover:border-brand hover:text-brand disabled:opacity-50"
        >
          {uploading ? "…" : "📷"}
        </button>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit(draft);
            }
          }}
          rows={1}
          placeholder="כתבו לסוכן, או הדביקו קישור…"
          aria-label="הודעה לסוכן"
          className="max-h-40 min-h-11 flex-1 resize-none rounded-2xl border border-border bg-surface px-4 py-2.5 text-[15px] outline-none transition focus:border-brand"
        />
        <button
          type="submit"
          disabled={sending || !draft.trim()}
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
