"use client";

// The storyboard editor: every beat of the video before anything is produced. The user edits each
// narration line and what is on screen, picks the narrator, music and captions, or asks the agent
// for changes. Edits save as they type; credits are spent only on "approve and produce".
import { useEffect, useRef, useState } from "react";
import { paywalled, refreshAccount } from "@/components/account";
import { COST } from "@/lib/plans";
import { ambiguousWords } from "@/lib/video/homographs";
import {
  BEAT_ROLES,
  CAPTION_LABELS,
  CAPTION_STYLES,
  LENGTH,
  MUSIC_PRESETS,
  ROLE_LABELS,
  VISUAL_LABELS,
  VISUALS,
  beatSeconds,
  estimateSeconds,
  type BeatRole,
  type CaptionStyle,
  type CourseClip,
  type Visual,
} from "@/lib/video/storyboard-ui";
import { VOICES, VOICE_KEYS } from "@/lib/video/voices";

export type Beat = {
  id: string;
  role: BeatRole;
  voice: string;
  title: string;
  sub: string;
  items: string[];
  visual: Visual;
  shot?: string;
  clipId?: string;
  clipStart?: number;
  clipEnd?: number;
  clipAudio?: boolean;
  motion?: boolean;
  emphasis: string[];
};
export type Storyboard = {
  kind: "promo" | "marketing";
  voice: string;
  music: string;
  musicMood: string;
  captions: CaptionStyle;
  beats: Beat[];
};
export type Video = {
  id: string;
  kind: "promo" | "marketing";
  voice: string;
  status: string;
  url: string | null;
  error: string | null;
  created_at: string;
  storyboard: Storyboard | null;
};

const field =
  "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand";
const small =
  "rounded-lg border border-border px-2 py-1 text-xs hover:border-brand disabled:opacity-30";

export function StoryboardEditor({
  kitId,
  video,
  paid,
  clips,
  onChange,
  onRemoved,
}: {
  kitId: string;
  video: Video;
  paid: boolean;
  clips: CourseClip[];
  onChange: (v: Video) => void;
  onRemoved: () => void;
}) {
  const [sb, setSb] = useState<Storyboard>(video.storyboard!);
  const [saved, setSaved] = useState<"saved" | "saving" | "error">("saved");
  const [busy, setBusy] = useState<"revise" | "produce" | "delete" | null>(
    null,
  );
  const [instruction, setInstruction] = useState("");
  const [error, setError] = useState("");
  const [issues, setIssues] = useState<
    { id: string; words: string[] }[] | null
  >(null);
  // The agent's own music, kept as a choice after the user tries a preset.
  const [suggested, setSuggested] = useState({
    music: video.storyboard!.music,
    musicMood: video.storyboard!.musicMood,
  });
  const dirty = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const latest = useRef(sb);

  const save = async () => {
    clearTimeout(timer.current);
    if (!dirty.current) return true;
    dirty.current = false;
    setSaved("saving");
    const res = await fetch(`/api/kits/${kitId}/videos/${video.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storyboard: latest.current }),
    }).catch(() => null);
    setSaved(res?.ok ? "saved" : "error");
    return Boolean(res?.ok);
  };
  useEffect(() => () => void save(), []); // eslint-disable-line react-hooks/exhaustive-deps -- flush on leave

  const update = (next: Storyboard) => {
    latest.current = next;
    setSb(next);
    setIssues(null);
    dirty.current = true;
    setSaved("saving");
    clearTimeout(timer.current);
    timer.current = setTimeout(save, 900);
  };
  const setBeat = (id: string, patch: Partial<Beat>) =>
    update({
      ...sb,
      beats: sb.beats.map((b) => {
        if (b.id !== id) return b;
        const next = { ...b, ...patch };
        // Caption emphasis follows the words that are still in the line.
        return {
          ...next,
          emphasis: next.emphasis.filter((w) => next.voice.includes(w)),
        };
      }),
    });
  const move = (i: number, d: -1 | 1) => {
    const beats = [...sb.beats];
    [beats[i], beats[i + d]] = [beats[i + d], beats[i]];
    update({ ...sb, beats });
  };
  const remove = (id: string) =>
    update({ ...sb, beats: sb.beats.filter((b) => b.id !== id) });
  const add = () =>
    update({
      ...sb,
      beats: [
        ...sb.beats,
        {
          id: `n${crypto.randomUUID().slice(0, 8)}`,
          role: "outcomes",
          voice: "",
          title: "",
          sub: "",
          items: [],
          visual: "scene",
          shot: "",
          clipId: "",
          clipStart: 0,
          clipEnd: 0,
          clipAudio: false,
          motion: false,
          emphasis: [],
        },
      ],
    });

  const revise = async () => {
    if (!instruction.trim()) return;
    setBusy("revise");
    setError("");
    await save();
    const res = await fetch(`/api/kits/${kitId}/videos/${video.id}/revise`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ instruction }),
    }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    setBusy(null);
    if (!res?.ok) return setError(data?.error ?? "השינוי לא בוצע. נסו שוב.");
    const next: Storyboard = data.video.storyboard;
    latest.current = next;
    setSb(next);
    if (!MUSIC_PRESETS.some((p) => p.prompt === next.music))
      setSuggested({ music: next.music, musicMood: next.musicMood });
    setInstruction("");
    onChange(data.video);
  };

  const produce = async (force = false) => {
    setBusy("produce");
    setError("");
    if (!(await save())) {
      setBusy(null);
      return setError("לא הצלחנו לשמור את השינויים. בדקו את החיבור ונסו שוב.");
    }
    const res = await fetch(`/api/kits/${kitId}/videos/${video.id}/produce`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ force }),
    }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    setBusy(null);
    if (!res) return setError("אין חיבור. נסו שוב.");
    if (res.status === 422 && data.code === "speech")
      return setIssues(data.issues);
    if (paywalled(res, data)) return;
    if (!res.ok) return setError(data.error ?? "ההפקה לא התחילה");
    refreshAccount();
    onChange(data.video);
  };

  const discard = async () => {
    if (!confirm("למחוק את הטיוטה? התסריט לא יישמר.")) return;
    setBusy("delete");
    clearTimeout(timer.current);
    dirty.current = false;
    const res = await fetch(`/api/kits/${kitId}/videos/${video.id}`, {
      method: "DELETE",
    }).catch(() => null);
    setBusy(null);
    if (res?.ok) onRemoved();
    else setError("המחיקה נכשלה");
  };

  const seconds = estimateSeconds(sb);
  const [min, max] = LENGTH[sb.kind];
  const lengthTone =
    seconds < min - 3 || seconds > max + 5
      ? "text-danger"
      : seconds < min || seconds > max
        ? "text-amber-500"
        : "text-emerald-500";
  const musicValue = MUSIC_PRESETS.some((p) => p.prompt === sb.music)
    ? sb.music
    : "agent";
  const speaks = (b: Beat) => b.visual === "clip" && Boolean(b.clipAudio);
  const empty = sb.beats.some((b) => !b.voice.trim() && !speaks(b));
  const ready = clips.filter((c) => c.status === "ready");
  const motions = sb.beats.filter(
    (b) => b.visual === "scene" && b.motion,
  ).length;
  const cost = COST.video + motions * COST.motion;
  // Choosing "a clip from the course" starts on the first clip's best moment.
  const toVisual = (b: Beat, visual: Visual) => {
    if (visual !== "clip" || b.clipId) return setBeat(b.id, { visual });
    const c = ready[0];
    const h = c?.highlights?.find((x) => !x.quote) ?? c?.highlights?.[0];
    setBeat(b.id, {
      visual,
      clipId: c?.id ?? "",
      clipStart: h?.start ?? 0,
      clipEnd: h?.end ?? Math.min(4, c?.seconds ?? 4),
      clipAudio: false,
    });
  };

  return (
    <div className="space-y-4 rounded-3xl border border-brand/40 bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-black">
            התסריט של {sb.kind === "promo" ? "סרטון הפרומו" : "סרטון השיווק"}
          </h3>
          <p className="text-sm text-muted">
            כל מילה כאן בשליטתכם: הקריינות, הכותרות ומה רואים בכל רגע. שום קרדיט
            לא יורד עד האישור.
          </p>
        </div>
        <span className="text-xs text-muted" aria-live="polite">
          {saved === "saving"
            ? "שומר…"
            : saved === "error"
              ? "⚠ השמירה נכשלה"
              : "✓ נשמר"}
        </span>
      </div>

      {/* Length gauge */}
      <div className="rounded-2xl bg-background p-3">
        <div className="flex items-center justify-between text-sm">
          <span>
            אורך משוער: <b className={lengthTone}>{seconds} שניות</b>
          </span>
          <span className="text-xs text-muted">
            מומלץ: {min}–{max} שניות · {sb.beats.length} קטעים
          </span>
        </div>
        <div className="relative mt-2 h-2 rounded-full bg-border">
          <div
            className="absolute inset-y-0 rounded-full bg-emerald-500/30"
            style={{
              right: `${(min / (max + 20)) * 100}%`,
              width: `${((max - min) / (max + 20)) * 100}%`,
            }}
          />
          <div
            className="absolute -top-1 size-4 rounded-full border-2 border-surface bg-brand"
            style={{
              right: `calc(${Math.min(seconds / (max + 20), 1) * 100}% - 8px)`,
            }}
          />
        </div>
      </div>

      {/* While the agent rewrites, the editor waits (its answer replaces the whole storyboard). */}
      <fieldset
        disabled={busy !== null}
        className="space-y-4 disabled:opacity-60"
      >
        {/* Narrator, music, captions */}
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="space-y-1 text-sm">
            <span className="font-bold">קריין</span>
            <select
              className={field}
              value={sb.voice}
              onChange={(e) => update({ ...sb, voice: e.target.value })}
            >
              {VOICE_KEYS.map((k) => (
                <option key={k} value={k}>
                  {VOICES[k].name} ({VOICES[k].note})
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-bold">מוזיקה</span>
            <select
              className={field}
              value={musicValue}
              onChange={(e) => {
                const p = MUSIC_PRESETS.find(
                  (x) => x.prompt === e.target.value,
                );
                update({
                  ...sb,
                  ...(p ? { music: p.prompt, musicMood: p.label } : suggested),
                });
              }}
            >
              <option value="agent">{suggested.musicMood} (הצעת הסוכן)</option>
              {MUSIC_PRESETS.map((p) => (
                <option key={p.prompt} value={p.prompt}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-bold">כתוביות</span>
            <select
              className={field}
              value={sb.captions}
              onChange={(e) =>
                update({ ...sb, captions: e.target.value as CaptionStyle })
              }
            >
              {CAPTION_STYLES.map((c) => (
                <option key={c} value={c}>
                  {CAPTION_LABELS[c]}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Beats */}
        <ol className="space-y-3">
          {sb.beats.map((b, i) => {
            const risky = ambiguousWords(b.voice);
            const flagged = issues?.some((x) => x.id === b.id);
            return (
              <li
                key={b.id}
                className={`space-y-2 rounded-2xl border bg-background p-3 ${flagged ? "border-danger" : "border-border"}`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="grid size-7 place-items-center rounded-full bg-brand text-xs font-black text-white">
                    {i + 1}
                  </span>
                  <select
                    aria-label="תפקיד הקטע"
                    className="rounded-lg border border-border bg-surface px-2 py-1 text-xs font-bold"
                    value={b.role}
                    onChange={(e) =>
                      setBeat(b.id, { role: e.target.value as BeatRole })
                    }
                  >
                    {BEAT_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABELS[r]}
                      </option>
                    ))}
                  </select>
                  <select
                    aria-label="מה רואים"
                    className="rounded-lg border border-border bg-surface px-2 py-1 text-xs"
                    value={b.visual}
                    onChange={(e) => toVisual(b, e.target.value as Visual)}
                  >
                    {VISUALS.map((v) => (
                      <option key={v} value={v}>
                        רואים: {VISUAL_LABELS[v]}
                      </option>
                    ))}
                  </select>
                  <span className="text-xs text-muted">
                    ~{beatSeconds(b).toFixed(1)} שנ׳
                  </span>
                  <span className="ms-auto flex gap-1">
                    <button
                      className={small}
                      disabled={i === 0}
                      onClick={() => move(i, -1)}
                      aria-label="הזזה למעלה"
                    >
                      ↑
                    </button>
                    <button
                      className={small}
                      disabled={i === sb.beats.length - 1}
                      onClick={() => move(i, 1)}
                      aria-label="הזזה למטה"
                    >
                      ↓
                    </button>
                    <button
                      className={`${small} hover:border-danger hover:text-danger`}
                      disabled={sb.beats.length <= 3}
                      onClick={() => remove(b.id)}
                      aria-label="מחיקת הקטע"
                    >
                      ✕
                    </button>
                  </span>
                </div>
                {b.visual === "clip" && (
                  <ClipPicker
                    beat={b}
                    clips={ready}
                    onChange={(patch) => setBeat(b.id, patch)}
                  />
                )}
                <label className={speaks(b) ? "hidden" : "block space-y-1"}>
                  <span className="text-xs font-bold text-muted">
                    🎙 קריינות
                  </span>
                  <textarea
                    className={`${field} min-h-16 resize-y leading-relaxed`}
                    value={b.voice}
                    onChange={(e) => setBeat(b.id, { voice: e.target.value })}
                    placeholder="מה הקריין אומר ברגע הזה"
                  />
                </label>
                {risky.length > 0 && (
                  <p className="text-xs text-amber-600">
                    ⚠ הקריין עלול לבטא לא נכון: {risky.join(", ")}. כדאי להחליף
                    במילה שנקראת רק בדרך אחת.
                  </p>
                )}
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="block space-y-1">
                    <span className="text-xs font-bold text-muted">
                      כותרת על המסך (עד 5 מילים)
                    </span>
                    <input
                      className={field}
                      value={b.title}
                      onChange={(e) => setBeat(b.id, { title: e.target.value })}
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-xs font-bold text-muted">
                      שורה משנית (לא חובה)
                    </span>
                    <input
                      className={field}
                      value={b.sub}
                      onChange={(e) => setBeat(b.id, { sub: e.target.value })}
                    />
                  </label>
                </div>
                {b.title.trim().split(/\s+/).length > 5 && (
                  <p className="text-xs text-amber-600">
                    כותרת ארוכה תופיע קטנה יותר. עדיף עד 5 מילים.
                  </p>
                )}
                {b.visual === "scene" && (
                  <label className="block space-y-1">
                    <span className="text-xs font-bold text-muted">
                      🎥 מה המצלמה רואה (תמונה שתיווצר לרגע הזה)
                    </span>
                    <input
                      className={field}
                      value={b.shot ?? ""}
                      onChange={(e) => setBeat(b.id, { shot: e.target.value })}
                      placeholder="למשל: ידיים מקפלות בצק על משטח עץ, אור חלון רך"
                    />
                  </label>
                )}
                {b.visual === "scene" && (
                  <label
                    className={`flex items-center gap-2 text-xs ${paid ? "" : "opacity-60"}`}
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(b.motion)}
                      disabled={!paid}
                      onChange={(e) =>
                        setBeat(b.id, { motion: e.target.checked })
                      }
                    />
                    <span>
                      🎬 להפוך את התמונה לקטע וידאו AI בתנועה (+{COST.motion}{" "}
                      קרדיטים)
                      {!paid && " · במסלולים בתשלום"}
                    </span>
                  </label>
                )}
                {b.visual === "list" && (
                  <label className="block space-y-1">
                    <span className="text-xs font-bold text-muted">
                      פריטי הרשימה (שורה לכל פריט, 3–5)
                    </span>
                    <textarea
                      className={`${field} min-h-20 resize-y`}
                      value={b.items.join("\n")}
                      onChange={(e) =>
                        setBeat(b.id, {
                          items: e.target.value.split("\n").slice(0, 6),
                        })
                      }
                    />
                  </label>
                )}
              </li>
            );
          })}
        </ol>
        <button
          onClick={add}
          disabled={sb.beats.length >= 16}
          className="w-full rounded-2xl border border-dashed border-border py-2 text-sm font-bold text-muted hover:border-brand hover:text-brand disabled:opacity-40"
        >
          + הוספת קטע
        </button>
      </fieldset>

      {/* Ask the agent */}
      <div className="space-y-2 rounded-2xl bg-background p-3">
        <p className="text-sm font-bold">רוצים שהסוכן ישנה משהו?</p>
        <div className="flex gap-2">
          <input
            className={field}
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && revise()}
            placeholder="למשל: פתיחה חדה יותר, פחות מילים, להדגיש את המחיר"
            disabled={busy !== null}
          />
          <button
            onClick={revise}
            disabled={busy !== null || !instruction.trim()}
            className="shrink-0 rounded-xl bg-brand px-4 text-sm font-bold text-white hover:bg-brand-strong disabled:opacity-50"
          >
            {busy === "revise" ? "משכתב…" : "שינוי"}
          </button>
        </div>
      </div>

      {issues && (
        <div className="space-y-2 rounded-2xl border border-danger/50 bg-danger/5 p-3 text-sm">
          <p className="font-bold">
            בקטעים המסומנים יש מילים שהקריין עלול לבטא לא נכון:
          </p>
          <ul className="list-inside list-disc text-xs">
            {issues.map((x) => (
              <li key={x.id}>
                קטע {sb.beats.findIndex((b) => b.id === x.id) + 1}:{" "}
                {x.words.join(", ")}
              </li>
            ))}
          </ul>
          <button
            onClick={() => produce(true)}
            disabled={busy !== null}
            className="text-xs font-bold text-danger underline"
          >
            להפיק בכל זאת
          </button>
        </div>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => produce()}
          disabled={busy !== null || empty || sb.beats.length < 3}
          className="flex-1 rounded-2xl bg-gradient-to-l from-brand to-brand-strong px-5 py-3 text-lg font-black text-white shadow-lg shadow-brand/20 hover:brightness-110 disabled:opacity-60"
        >
          {busy === "produce"
            ? "מתחיל הפקה…"
            : `🎬 אישור והפקה · ${paid ? `${cost} קרדיטים` : "סרטון לדוגמה"}`}
        </button>
        <button
          onClick={discard}
          disabled={busy !== null}
          className="text-sm text-muted hover:text-danger"
        >
          מחיקת הטיוטה
        </button>
      </div>
      {empty && (
        <p className="text-xs text-amber-600">
          יש קטע בלי קריינות. כתבו בו משהו או מחקו אותו.
        </p>
      )}
    </div>
  );
}

const clock = (s: number) =>
  `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, "0")}`;

/** Which course clip a beat cuts to, and which moment of it: the agent's marked moments, or exact
 * times, with a preview that plays just that span. */
function ClipPicker({
  beat,
  clips,
  onChange,
}: {
  beat: Beat;
  clips: CourseClip[];
  onChange: (patch: Partial<Beat>) => void;
}) {
  const preview = useRef<HTMLVideoElement>(null);
  const clip = clips.find((c) => c.id === beat.clipId);
  if (!clips.length)
    return (
      <p className="rounded-xl bg-amber-500/10 p-2 text-xs text-amber-700">
        עוד אין קטעים מהקורס. העלו קטעים בתיבה ״קטעים מהקורס״ למעלה, ואז בחרו
        אותם כאן.
      </p>
    );
  const start = beat.clipStart ?? 0;
  const end = beat.clipEnd ?? 0;
  const said = clip?.words
    ?.filter((w) => w.start >= start - 0.05 && w.end <= end + 0.05)
    .map((w) => w.text)
    .join(" ");
  const play = () => {
    const v = preview.current;
    if (!v) return;
    v.currentTime = start;
    v.muted = false;
    void v.play();
  };
  return (
    <div className="space-y-2 rounded-xl border border-border p-2">
      <div className="flex flex-wrap items-center gap-2">
        <select
          aria-label="איזה קטע"
          className="rounded-lg border border-border bg-surface px-2 py-1 text-xs"
          value={beat.clipId ?? ""}
          onChange={(e) => {
            const c = clips.find((x) => x.id === e.target.value);
            const h = c?.highlights?.[0];
            onChange({
              clipId: e.target.value,
              clipStart: h?.start ?? 0,
              clipEnd: h?.end ?? Math.min(4, c?.seconds ?? 4),
              clipAudio: Boolean(h?.quote),
            });
          }}
        >
          {clips.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-1 text-xs">
          מ־
          <input
            type="number"
            step={0.1}
            min={0}
            className="w-16 rounded-lg border border-border bg-surface px-1 py-0.5"
            value={start}
            onChange={(e) => onChange({ clipStart: Number(e.target.value) })}
          />
        </label>
        <label className="flex items-center gap-1 text-xs">
          עד
          <input
            type="number"
            step={0.1}
            min={0}
            className="w-16 rounded-lg border border-border bg-surface px-1 py-0.5"
            value={end}
            onChange={(e) => onChange({ clipEnd: Number(e.target.value) })}
          />
        </label>
        <span className="text-xs text-muted">
          ({Math.max(0, end - start).toFixed(1)} שנ׳)
        </span>
        <button
          type="button"
          onClick={play}
          className="rounded-lg border border-border px-2 py-0.5 text-xs hover:border-brand"
        >
          ▶ צפייה
        </button>
      </div>
      {clip?.highlights && clip.highlights.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {clip.highlights.map((h, i) => (
            <button
              key={i}
              type="button"
              onClick={() =>
                onChange({
                  clipStart: h.start,
                  clipEnd: h.end,
                  clipAudio: h.quote,
                })
              }
              className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${Math.abs(h.start - start) < 0.05 && Math.abs(h.end - end) < 0.05 ? "bg-brand text-white" : "bg-brand/10 text-brand"}`}
            >
              {h.quote ? "💬 " : ""}
              {h.label} · {clock(h.start)}
            </button>
          ))}
        </div>
      )}
      {clip && (
        <video
          ref={preview}
          src={clip.url}
          preload="metadata"
          playsInline
          className="aspect-video w-full max-w-xs rounded-lg bg-black object-contain"
          onTimeUpdate={(e) => {
            if (e.currentTarget.currentTime >= end) e.currentTarget.pause();
          }}
        />
      )}
      <label className="flex items-center gap-2 text-xs">
        <input
          type="checkbox"
          checked={Boolean(beat.clipAudio)}
          onChange={(e) => onChange({ clipAudio: e.target.checked })}
        />
        💬 להשמיע את המרצה מהקטע (בלי קריינות ברגע הזה)
      </label>
      {beat.clipAudio && said && (
        <p className="rounded-lg bg-background p-2 text-xs leading-relaxed">
          ״{said}״
        </p>
      )}
    </div>
  );
}
