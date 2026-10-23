"use client";

// The course's own footage: the user uploads clips (or gives a direct link to a video file), the
// agent watches each one and marks its strong moments, and the storyboard can cut them in.
import { useRef, useState } from "react";
import { importClip, uploadClip } from "@/lib/upload-clips";
import { MAX_CLIP_MB, MAX_CLIPS } from "@/lib/video/clip-files";
import type { CourseClip } from "@/lib/video/storyboard-ui";

const time = (s: number) =>
  `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export function CourseClips({
  kitId,
  clips,
  onChange,
}: {
  kitId: string;
  clips: CourseClip[];
  onChange: (c: CourseClip[]) => void;
}) {
  const [jobs, setJobs] = useState<
    { key: string; name: string; step: string }[]
  >([]);
  const [error, setError] = useState("");
  const [link, setLink] = useState("");
  const [drag, setDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const run = async (
    name: string,
    work: (onStep: (s: string) => void) => Promise<{ clips: CourseClip[] }>,
  ) => {
    const key = crypto.randomUUID();
    setJobs((j) => [...j, { key, name, step: "מתחיל…" }]);
    try {
      const { clips: next } = await work((step) =>
        setJobs((j) => j.map((x) => (x.key === key ? { ...x, step } : x))),
      );
      onChange(next);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setJobs((j) => j.filter((x) => x.key !== key));
    }
  };

  const add = (files: FileList | File[]) => {
    setError("");
    const list = [...files].filter((f) => f.type.startsWith("video/"));
    if (!list.length) return setError("אפשר להעלות כאן רק סרטונים");
    if (clips.length + jobs.length + list.length > MAX_CLIPS)
      return setError(`אפשר עד ${MAX_CLIPS} קטעים לערכה`);
    for (const f of list) run(f.name, (step) => uploadClip(kitId, f, step));
  };

  const fromLink = () => {
    if (!link.trim()) return;
    setError("");
    const url = link.trim();
    setLink("");
    run(url.split("/").pop() ?? "קישור", (step) =>
      importClip(kitId, url, step),
    );
  };

  const remove = async (c: CourseClip) => {
    if (!confirm(`להסיר את "${c.name}"?`)) return;
    const res = await fetch(`/api/kits/${kitId}/clips?clipId=${c.id}`, {
      method: "DELETE",
    }).catch(() => null);
    if (res?.ok) onChange((await res.json()).clips);
    else setError("ההסרה נכשלה");
  };

  return (
    <div
      className={`space-y-3 rounded-3xl border bg-surface p-5 transition ${drag ? "border-brand bg-brand/5" : "border-border"}`}
      onDragOver={(e) => (e.preventDefault(), setDrag(true))}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => (
        e.preventDefault(),
        setDrag(false),
        add(e.dataTransfer.files)
      )}
    >
      <div>
        <p className="font-bold">🎞 קטעים מהקורס</p>
        <p className="text-sm text-muted">
          העלו קטעים אמיתיים מהשיעורים, והסוכן יצפה בהם, יסמן את הרגעים החזקים
          וישלב אותם בסרטון (גם ציטוטים של המרצה בקול שלו). עד {MAX_CLIP_MB}MB
          לקטע, MP4 או MOV.
        </p>
      </div>

      {clips.length > 0 && (
        <ul className="space-y-2">
          {clips.map((c) => (
            <li
              key={c.id}
              className="flex gap-3 rounded-2xl border border-border bg-background p-2"
            >
              <div className="flex h-16 w-28 shrink-0 overflow-hidden rounded-xl bg-black">
                {c.thumbs[Math.floor(c.thumbs.length / 2)] && (
                  <div
                    role="img"
                    aria-label={c.name}
                    className="h-full w-full bg-cover bg-center"
                    style={{ backgroundImage: `url("${c.thumbs[Math.floor(c.thumbs.length / 2)].url}")` }}
                  />
                )}
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-bold">{c.name}</p>
                  <span className="text-xs text-muted">{time(c.seconds)}</span>
                  <button
                    onClick={() => remove(c)}
                    className="ms-auto text-xs text-muted hover:text-danger"
                    aria-label={`הסרת ${c.name}`}
                  >
                    ✕
                  </button>
                </div>
                {c.status === "analyzing" && (
                  <p className="text-xs text-brand">הסוכן צופה בקטע…</p>
                )}
                {c.status === "failed" && (
                  <p className="text-xs text-danger">
                    לא הצלחנו לנתח את הקטע. אפשר להסיר ולהעלות שוב.
                  </p>
                )}
                {c.status === "ready" && (
                  <>
                    {c.summary && (
                      <p className="line-clamp-1 text-xs text-muted">
                        {c.summary}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-1">
                      {c.highlights?.map((h, i) => (
                        <span
                          key={i}
                          className="rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-semibold text-brand"
                        >
                          {h.quote ? "💬 " : ""}
                          {h.label} · {time(h.start)}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {jobs.map((j) => (
        <div
          key={j.key}
          className="flex items-center gap-3 rounded-2xl border border-dashed border-brand/50 p-3 text-sm"
          aria-live="polite"
        >
          <span
            className="size-4 shrink-0 animate-spin rounded-full border-2 border-brand/30 border-t-brand"
            aria-hidden
          />
          <span className="truncate font-semibold">{j.name}</span>
          <span className="text-muted">{j.step}</span>
        </div>
      ))}

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => input.current?.click()}
          disabled={clips.length + jobs.length >= MAX_CLIPS}
          className="rounded-xl bg-brand px-4 py-2 text-sm font-bold text-white hover:bg-brand-strong disabled:opacity-50"
        >
          + העלאת קטעים
        </button>
        <input
          ref={input}
          type="file"
          accept="video/mp4,video/quicktime,video/webm"
          multiple
          hidden
          onChange={(e) => (
            e.target.files && add(e.target.files),
            (e.target.value = "")
          )}
        />
        <div className="flex min-w-60 flex-1 gap-2">
          <input
            value={link}
            onChange={(e) => setLink(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fromLink()}
            placeholder="או קישור ישיר לקובץ וידאו (‎.mp4)"
            dir="ltr"
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand"
          />
          <button
            onClick={fromLink}
            disabled={!link.trim()}
            className="shrink-0 rounded-xl border border-border px-3 text-sm font-bold hover:border-brand disabled:opacity-50"
          >
            הוספה
          </button>
        </div>
      </div>
      <p className="text-xs text-muted">
        קטעים מיוטיוב או מרשתות חברתיות: הורידו אותם למחשב והעלו כאן. אפשר גם
        לגרור קבצים לתיבה.
      </p>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
