"use client";

// The video editor: small changes to a finished video, seen at once in a live preview, then saved as
// a new version (the original stays). Per scene: the words on screen, the captions (spelling), the
// highlighted words, the narration line (recorded again), the motion, the transition, or the scene
// itself. For the whole video: colours, caption style, music level. Or ask the agent in words.
import type { PlayerRef } from "@remotion/player";
import dynamic from "next/dynamic";
import { useMemo, useRef, useState } from "react";
import { paywalled, refreshAccount } from "@/components/account";
import {
  FPS,
  sceneStarts,
  videoDuration,
  type VideoProps,
} from "@/engine/video/schema";
import { COST } from "@/lib/plans";
import {
  CAPTION_LABELS,
  CAPTION_STYLES,
  ROLE_LABELS,
  VISUAL_LABELS,
  type CaptionStyle,
} from "@/lib/video/storyboard-ui";
import { applyEdits, type EditOp, type Revoice } from "@/lib/video/video-edits";
import type { Video } from "./storyboard";

const Preview = dynamic(
  () => import("./video-preview").then((m) => m.VideoPreview),
  {
    ssr: false,
    loading: () => (
      <div className="aspect-[9/16] w-full animate-pulse rounded-2xl bg-black/80" />
    ),
  },
);

const TRANSITION_LABELS = {
  cut: "חיתוך חד",
  whip: "סחרור (וויפ)",
  zoom: "זום",
  flash: "הבזק אור",
  fade: "דהייה",
} as const;
const field =
  "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand";
const clean = (w: string) => w.replace(/[.,!?:;…"״׳']/g, "");

export function VideoEditor({
  kitId,
  video,
  initial,
  onClose,
  onCreated,
}: {
  kitId: string;
  video: Video;
  initial: VideoProps;
  onClose: () => void;
  onCreated: (v: Video) => void;
}) {
  const [spec, setSpec] = useState(initial);
  const [revoice, setRevoice] = useState<Revoice[]>([]);
  const [sel, setSel] = useState(0);
  const [ask, setAsk] = useState("");
  const [busy, setBusy] = useState<"agent" | "save" | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const player = useRef<PlayerRef>(null);
  const dirty = spec !== initial || revoice.length > 0;

  const edit = (ops: EditOp[]) => {
    const out = applyEdits(spec, ops, revoice);
    setSpec(out.spec);
    setRevoice(out.revoice);
    setSel((i) => Math.min(i, out.spec.scenes.length - 1));
  };
  const starts = useMemo(() => sceneStarts(spec.scenes), [spec.scenes]);
  const seek = (i: number) => {
    setSel(i);
    player.current?.seekTo(starts[i] + 8);
  };
  const s = spec.scenes[sel];
  const n = sel + 1;
  const pendingVoice = revoice.find((r) => r.scene === n);
  const caption = s.words.map((w) => w.text).join(" ");

  const askAgent = async () => {
    if (!ask.trim()) return;
    setBusy("agent");
    setError("");
    setNote("");
    const res = await fetch(
      `/api/kits/${kitId}/videos/${video.id}/edit-agent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spec, instruction: ask }),
      },
    ).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    setBusy(null);
    if (res && paywalled(res, data)) return;
    if (!res?.ok) return setError(data?.error ?? "השינוי לא בוצע. נסו שוב.");
    refreshAccount();
    edit(data.ops ?? []);
    setNote(data.reply ?? "");
    setAsk("");
  };

  const save = async () => {
    setBusy("save");
    setError("");
    const res = await fetch(`/api/kits/${kitId}/videos/${video.id}/versions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ spec, revoice }),
    }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    setBusy(null);
    if (res && paywalled(res, data)) return;
    if (!res?.ok) return setError(data?.error ?? "השמירה לא התחילה. נסו שוב.");
    refreshAccount();
    onCreated(data.video);
  };

  const close = () => {
    if (dirty && !confirm("לצאת בלי לשמור את השינויים?")) return;
    onClose();
  };

  const seconds = (videoDuration(spec.scenes) / FPS).toFixed(1);

  return (
    <div
      role="dialog"
      aria-modal
      aria-label="עורך הסרטון"
      className="fixed inset-0 z-50 flex flex-col bg-bg"
    >
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border px-4">
        <div className="min-w-0">
          <p className="truncate font-black">✂️ עורך הסרטון</p>
          <p className="truncate text-xs text-muted">
            {spec.scenes.length} קטעים · {seconds} שניות · השינויים נשמרים כגרסה
            חדשה, המקור נשאר
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={close}
            className="rounded-full px-3 py-1.5 text-sm font-semibold text-muted hover:bg-surface hover:text-text"
          >
            סגירה
          </button>
          <button
            onClick={save}
            disabled={!dirty || busy !== null}
            className="rounded-full bg-brand px-4 py-2 text-sm font-bold text-white hover:bg-brand-strong disabled:opacity-50"
          >
            {busy === "save"
              ? "מתחיל…"
              : `שמירה כגרסה חדשה · ${COST.videoEdit} קרדיטים`}
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto md:flex-row md:overflow-hidden">
        {/* The preview */}
        <div className="shrink-0 bg-black/90 p-3 md:flex md:w-[38%] md:items-center md:justify-center md:p-6">
          <div className="mx-auto w-full max-w-[260px] md:max-w-[340px]">
            <Preview ref={player} spec={spec} />
          </div>
        </div>

        {/* The controls */}
        <div className="min-h-0 flex-1 space-y-4 p-4 md:overflow-y-auto">
          {/* Scenes */}
          <div
            className="flex gap-2 overflow-x-auto pb-1"
            role="tablist"
            aria-label="קטעים"
          >
            {spec.scenes.map((x, i) => (
              <button
                key={i}
                role="tab"
                aria-selected={i === sel}
                onClick={() => seek(i)}
                className={`shrink-0 rounded-xl border px-3 py-2 text-start text-xs ${i === sel ? "border-brand bg-brand/10" : "border-border hover:border-brand/50"}`}
              >
                <span className="block font-black">
                  {i + 1} · {ROLE_LABELS[x.role]}
                </span>
                <span className="block text-muted">
                  {(starts[i] / FPS).toFixed(1)}ש׳ · {VISUAL_LABELS[x.visual]}
                  {revoice.some((r) => r.scene === i + 1) ? " · 🎙" : ""}
                </span>
              </button>
            ))}
          </div>

          <section className="space-y-3 rounded-2xl border border-border bg-surface p-4">
            <div className="flex items-center justify-between">
              <p className="font-black">קטע {n}</p>
              <button
                onClick={() => edit([{ op: "delete", scene: n }])}
                disabled={spec.scenes.length <= 2}
                className="text-xs font-semibold text-muted hover:text-danger disabled:opacity-40"
              >
                🗑 מחיקת הקטע
              </button>
            </div>
            {s.role !== "cta" && s.visual !== "list" && (
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="block space-y-1">
                  <span className="text-xs font-bold text-muted">
                    כותרת על המסך
                  </span>
                  <input
                    className={field}
                    value={s.title}
                    onChange={(e) =>
                      edit([{ op: "title", scene: n, text: e.target.value }])
                    }
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-xs font-bold text-muted">
                    שורה משנית
                  </span>
                  <input
                    className={field}
                    value={s.sub}
                    onChange={(e) =>
                      edit([{ op: "sub", scene: n, text: e.target.value }])
                    }
                  />
                </label>
              </div>
            )}
            {s.words.length > 0 && (
              <>
                <label className="block space-y-1">
                  <span className="text-xs font-bold text-muted">
                    כתוביות (תיקון כתיב; הקול לא משתנה)
                  </span>
                  <input
                    key={`cap-${sel}-${caption.length}`}
                    className={field}
                    defaultValue={caption}
                    onBlur={(e) =>
                      e.target.value !== caption &&
                      edit([{ op: "caption", scene: n, text: e.target.value }])
                    }
                  />
                </label>
                <div className="space-y-1">
                  <span className="text-xs font-bold text-muted">
                    מילים מודגשות (לחיצה מסמנת או מבטלת)
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {s.words.map((w, k) => {
                      const on = s.emphasis.includes(clean(w.text));
                      return (
                        <button
                          key={k}
                          onClick={() =>
                            edit([
                              {
                                op: "emphasis",
                                scene: n,
                                words: on
                                  ? s.emphasis.filter(
                                      (x) => x !== clean(w.text),
                                    )
                                  : [...s.emphasis, clean(w.text)],
                              },
                            ])
                          }
                          className={`rounded-lg px-2 py-0.5 text-sm ${on ? "bg-brand font-bold text-white" : "bg-background hover:bg-brand/10"}`}
                          aria-pressed={on}
                        >
                          {w.text}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
            {s.audio && (
              <label className="block space-y-1">
                <span className="text-xs font-bold text-muted">
                  🎙 קריינות {pendingVoice ? "· תוקלט מחדש בשמירה" : ""}
                </span>
                <textarea
                  key={`voice-${sel}-${pendingVoice ? 1 : 0}`}
                  className={`${field} min-h-16 resize-y`}
                  defaultValue={pendingVoice?.text ?? s.voice}
                  onBlur={(e) =>
                    e.target.value.trim() !== s.voice.trim() &&
                    edit([{ op: "voice", scene: n, text: e.target.value }])
                  }
                />
                {pendingVoice && (
                  <button
                    onClick={() =>
                      setRevoice((r) => r.filter((x) => x.scene !== n))
                    }
                    className="text-xs font-semibold text-muted hover:text-text"
                  >
                    ביטול השינוי בקריינות
                  </button>
                )}
              </label>
            )}
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={Boolean(s.calm)}
                  onChange={(e) =>
                    edit([
                      { op: "calm", scene: n, value: e.target.checked ? 1 : 0 },
                    ])
                  }
                />
                בלי תנועה בקטע (מחיקת הנפשה)
              </label>
              {sel < spec.scenes.length - 1 && (
                <label className="flex items-center gap-2 text-sm">
                  מעבר לקטע הבא:
                  <select
                    className="rounded-lg border border-border bg-background px-2 py-1 text-sm"
                    value={s.transition}
                    onChange={(e) =>
                      edit([
                        { op: "transition", scene: n, style: e.target.value },
                      ])
                    }
                  >
                    {Object.entries(TRANSITION_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          </section>

          <section className="space-y-3 rounded-2xl border border-border bg-surface p-4">
            <p className="font-black">כל הסרטון</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <label className="space-y-1 text-sm">
                <span className="block text-xs font-bold text-muted">
                  צבע הדגשה
                </span>
                <input
                  type="color"
                  className="h-9 w-full rounded-lg border border-border bg-background"
                  value={spec.design.brand.palette.accent}
                  onChange={(e) =>
                    edit([{ op: "accent", color: e.target.value }])
                  }
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="block text-xs font-bold text-muted">
                  צבע הטקסט
                </span>
                <input
                  type="color"
                  className="h-9 w-full rounded-lg border border-border bg-background"
                  value={spec.design.brand.palette.ink}
                  onChange={(e) => edit([{ op: "ink", color: e.target.value }])}
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="block text-xs font-bold text-muted">
                  כתוביות
                </span>
                <select
                  className={field}
                  value={spec.captions}
                  onChange={(e) =>
                    edit([
                      { op: "captions", style: e.target.value as CaptionStyle },
                    ])
                  }
                >
                  {CAPTION_STYLES.map((c) => (
                    <option key={c} value={c}>
                      {CAPTION_LABELS[c]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-sm">
                <span className="block text-xs font-bold text-muted">
                  עוצמת מוזיקה · {Math.round((spec.musicVolume ?? 1) * 100)}%
                </span>
                <input
                  type="range"
                  min={0}
                  max={2}
                  step={0.1}
                  className="w-full"
                  value={spec.musicVolume ?? 1}
                  onChange={(e) =>
                    edit([{ op: "music", value: Number(e.target.value) }])
                  }
                />
              </label>
            </div>
          </section>

          <section className="space-y-2 rounded-2xl border border-brand/30 bg-brand/5 p-4">
            <p className="font-black">בקשו מהסוכן</p>
            <div className="flex gap-2">
              <input
                className={field}
                value={ask}
                onChange={(e) => setAsk(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && askAgent()}
                placeholder="למשל: בשנייה 12 תתקן ל״מחמצת״, תוריד את האנימציה בקטע 3, תדגיש את המחיר"
                disabled={busy !== null}
              />
              <button
                onClick={askAgent}
                disabled={busy !== null || !ask.trim()}
                className="shrink-0 rounded-xl bg-brand px-4 text-sm font-bold text-white hover:bg-brand-strong disabled:opacity-50"
              >
                {busy === "agent" ? "עורך…" : `שינוי · ${COST.edit}`}
              </button>
            </div>
            {note && <p className="text-sm text-brand">✓ {note}</p>}
          </section>
          {error && <p className="text-sm text-danger">{error}</p>}
        </div>
      </div>
    </div>
  );
}
