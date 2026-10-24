"use client";

// The kit's videos: pick a kind and a narrator, approve the storyboard the agent writes, then watch
// the production move through its steps.
import { useEffect, useRef, useState } from "react";
import { LENGTH } from "@/lib/video/storyboard-ui";
import { CourseClips } from "./clips";
import { StoryboardEditor, type Video } from "./storyboard";
import { VideoEditor } from "./video-editor";
import type { VideoProps } from "@/engine/video/schema";
import type { EditOp, VideoEditRequest } from "@/lib/video/video-edits";
import type { CourseClip } from "@/lib/video/storyboard-ui";
import { DEFAULT_VOICE, VOICES, VOICE_KEYS } from "@/lib/video/voices";
import { paywalled, refreshAccount, useAccount } from "@/components/account";
import { COST, kitFeatures } from "@/lib/plans";

const KINDS = {
  promo: {
    name: "סרטון פרומו",
    note: `טריילר לקורס: על מה הוא ומי מלמד · ${LENGTH.promo[0]}–${LENGTH.promo[1]} שניות`,
  },
  marketing: {
    name: "סרטון שיווק",
    note: `פתיחה שעוצרת גלילה, הכאב, הפתרון והנעה לפעולה · ${LENGTH.marketing[0]}–${LENGTH.marketing[1]} שניות`,
  },
} as const;

const STEPS: Record<string, string> = {
  writing: "מתחיל הפקה…",
  voicing: "מקליט קריינות, יוצר תמונות לסצנות ומלחין מוזיקה…",
  rendering: "עורך ומרנדר את הסרטון בענן…",
};

export function Videos({
  kitId,
  unlocked,
  request,
}: {
  kitId: string;
  unlocked: boolean;
  request?: VideoEditRequest | null; // a change the kit's chat asked for on one of the videos
}) {
  const [videos, setVideos] = useState<Video[] | null>(null);
  const [voice, setVoice] = useState<string>(DEFAULT_VOICE);
  const [starting, setStarting] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [clips, setClips] = useState<CourseClip[]>([]);
  useEffect(() => {
    fetch(`/api/kits/${kitId}/clips`)
      .then((r) => (r.ok ? r.json() : { clips: [] }))
      .then((d) => setClips(d.clips))
      .catch(() => {});
  }, [kitId]);

  const account = useAccount();
  const paid = account ? kitFeatures(account.plan, unlocked).videos : false;
  const working = videos?.some((v) => v.status in STEPS) ?? false;
  // A failed production gives its credits back: show the new balance.
  const failed = videos?.filter((v) => v.status === "failed").length ?? 0;
  useEffect(() => {
    if (failed) refreshAccount();
  }, [failed]);
  useEffect(() => {
    let live = true;
    const load = async () => {
      const res = await fetch(`/api/kits/${kitId}/videos`).catch(() => null);
      if (res?.ok && live) setVideos((await res.json()).videos);
    };
    load();
    if (!working && videos !== null) return () => void (live = false);
    const t = setInterval(load, 4000);
    return () => {
      live = false;
      clearInterval(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- polling restarts only when work starts or ends
  }, [kitId, working]);

  const start = async (kind: "promo" | "marketing") => {
    setStarting(kind);
    setError("");
    const res = await fetch(`/api/kits/${kitId}/videos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, voice }),
    });
    const data = await res.json().catch(() => ({}));
    setStarting(null);
    if (paywalled(res, data)) return;
    if (!res.ok) return setError(data.error ?? "כתיבת התסריט נכשלה");
    setVideos((v) => [data.video, ...(v ?? [])]);
    setOpen(data.video.id);
  };

  // The video editor opens on a finished video with its render spec (videos made by the older
  // engine have none it can edit: they get a new version from the script instead).
  const [editing2, setEditing2] = useState<{
    video: Video;
    spec: VideoProps;
    start?: { ops: EditOp[]; note: string };
  } | null>(null);
  const openEditor = (v: Video, start?: { ops: EditOp[]; note: string }) =>
    editorSpec(kitId, v.id).then((spec) => {
      setError(spec ? "" : "את הסרטון הזה אי אפשר לערוך בעורך (הופק בגרסה קודמת). אפשר ליצור גרסה חדשה מהתסריט.");
      if (spec) setEditing2({ video: v, spec, start });
    });
  // The chat's request opens once its video is in the list.
  const handled = useRef(0);
  useEffect(() => {
    if (!request || request.at === handled.current) return;
    const v = videos?.find((x) => x.id === request.videoId);
    if (!v) return;
    handled.current = request.at;
    openEditor(v, request);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs when a request arrives or the list loads
  }, [request, videos]);
  const reopen = async (v: Video) => {
    setError("");
    const res = await fetch(`/api/kits/${kitId}/videos/${v.id}`, {
      method: "POST",
    }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    if (!res?.ok) return setError(data?.error ?? "לא הצלחנו לפתוח את התסריט");
    setVideos((vs) =>
      data.copy
        ? [data.video, ...(vs ?? [])]
        : (vs?.map((x) => (x.id === v.id ? data.video : x)) ?? null),
    );
    setOpen(data.video.id);
  };
  const replace = (video: Video) =>
    setVideos((vs) => vs?.map((v) => (v.id === video.id ? video : v)) ?? null);
  const drafts = videos?.filter((v) => v.status === "draft") ?? [];
  const produced = videos?.filter((v) => v.status !== "draft") ?? [];
  const editing = drafts.find((v) => v.id === open) ?? drafts[0];

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-xl font-black">סרטונים</h2>
        <p className="text-sm text-muted">
          בגודל סטורי, עם קריינות בעברית, כתוביות ומוזיקה מקורית. קודם הסוכן
          כותב תסריט שאתם עורכים ומאשרים, ורק אז הסרטון מופק (כ־5 דקות).
        </p>
        {account && (
          <p className="mt-1 text-sm font-semibold text-brand">
            {paid
              ? `כל סרטון: ${COST.video} קרדיטים`
              : account.freeVideoUsed
                ? "🔒 הסרטון לדוגמה כבר נוצר. סרטונים נוספים כלולים במסלולים בתשלום."
                : "במסלול החינמי: סרטון פרומו אחד לדוגמה, עם חותמת."}
          </p>
        )}
      </div>

      <CourseClips kitId={kitId} clips={clips} onChange={setClips} />

      <div className="space-y-3 rounded-3xl border border-border bg-surface p-5">
        <p className="text-sm font-bold">הקול של הסרטון</p>
        <div
          className="grid grid-cols-3 gap-2"
          role="radiogroup"
          aria-label="קריין"
        >
          {VOICE_KEYS.map((k) => (
            <button
              key={k}
              role="radio"
              aria-checked={voice === k}
              onClick={() => setVoice(k)}
              className={`rounded-2xl border p-3 text-right transition ${voice === k ? "border-brand bg-brand/10" : "border-border hover:border-brand/50"}`}
            >
              <span className="block font-bold">{VOICES[k].name}</span>
              <span className="block text-xs text-muted">{VOICES[k].note}</span>
            </button>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {(Object.keys(KINDS) as (keyof typeof KINDS)[]).map((k) => (
            <button
              key={k}
              onClick={() => start(k)}
              disabled={starting !== null}
              className="rounded-2xl bg-gradient-to-l from-brand to-brand-strong p-4 text-right text-white shadow-lg shadow-brand/20 transition hover:brightness-110 disabled:opacity-60"
            >
              <span className="block text-lg font-black">
                {account && !paid && (account.freeVideoUsed || k !== "promo")
                  ? "🔒"
                  : "✍️"}{" "}
                {starting === k
                  ? "הסוכן כותב תסריט… (כדקה)"
                  : `תסריט ל${KINDS[k].name}`}
              </span>
              <span className="block text-sm text-white/80">
                {KINDS[k].note}
              </span>
            </button>
          ))}
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
      </div>

      {drafts.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {drafts.map((d, i) => (
            <button
              key={d.id}
              onClick={() => setOpen(d.id)}
              className={`rounded-full border px-3 py-1 text-xs font-bold ${d.id === editing?.id ? "border-brand bg-brand/10" : "border-border"}`}
            >
              טיוטה {drafts.length - i}: {KINDS[d.kind].name}
            </button>
          ))}
        </div>
      )}
      {editing?.storyboard && (
        <StoryboardEditor
          key={editing.id}
          kitId={kitId}
          video={editing}
          paid={paid}
          clips={clips}
          onChange={replace}
          onRemoved={() =>
            setVideos((vs) => vs?.filter((v) => v.id !== editing.id) ?? null)
          }
        />
      )}

      {produced.length > 0 && (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {produced.map((v) => (
            <li
              key={v.id}
              className="overflow-hidden rounded-2xl border border-border bg-surface"
            >
              <div className="relative aspect-[9/16] bg-black">
                {v.status === "ready" && v.url ? (
                  <video
                    src={v.url}
                    controls
                    playsInline
                    preload="metadata"
                    className="h-full w-full object-contain"
                  />
                ) : v.status === "failed" ? (
                  <div className="flex h-full items-center justify-center p-4 text-center text-sm text-danger">
                    ההפקה נכשלה והקרדיטים הוחזרו. אפשר לחזור לתסריט ולהפיק שוב.
                  </div>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-4 p-4 text-center">
                    <div
                      className="size-12 animate-spin rounded-full border-4 border-white/20 border-t-neon"
                      aria-hidden
                    />
                    <p
                      className="text-sm font-bold text-white"
                      aria-live="polite"
                    >
                      {STEPS[v.status] ?? "בהפקה…"}
                    </p>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 p-3">
                <div className="me-auto">
                  <p className="text-sm font-bold">
                    {KINDS[v.kind].name}
                    {v.edited_from ? " · גרסה ערוכה" : ""}
                  </p>
                  <p className="text-xs text-muted">
                    קול:{" "}
                    {VOICES[v.voice as keyof typeof VOICES]?.name ?? v.voice}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {v.status === "ready" && (
                    <button
                      onClick={() => openEditor(v)}
                      className="rounded-full border border-brand px-3 py-1.5 text-xs font-bold text-brand hover:bg-brand/10"
                    >
                      ✂️ עריכה
                    </button>
                  )}
                  {v.storyboard &&
                    (v.status === "ready" || v.status === "failed") && (
                      <button
                        onClick={() => reopen(v)}
                        className="rounded-full border border-border px-3 py-1.5 text-xs font-bold hover:border-brand"
                      >
                        {v.status === "failed" ? "חזרה לתסריט" : "✎ מהתסריט"}
                      </button>
                    )}
                  {v.status === "ready" && v.url && (
                    <a
                      href={`${v.url}?download=${encodeURIComponent(`${KINDS[v.kind].name}.mp4`)}`}
                      className="rounded-full bg-brand px-3 py-1.5 text-xs font-bold text-white hover:bg-brand-strong"
                    >
                      ⬇ הורדה
                    </a>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      {editing2 && (
        <VideoEditor
          kitId={kitId}
          video={editing2.video}
          initial={editing2.spec}
          start={editing2.start}
          onClose={() => setEditing2(null)}
          onCreated={(nv) => {
            setVideos((vs) => [nv, ...(vs ?? [])]);
            setEditing2(null);
          }}
        />
      )}
    </section>
  );
}

/** A finished video's render spec, or null when the editor can't open it (made by the older engine). */
async function editorSpec(kitId: string, videoId: string): Promise<VideoProps | null> {
  const res = await fetch(`/api/kits/${kitId}/videos/${videoId}`).catch(() => null);
  const data = await res?.json().catch(() => ({}));
  return res?.ok ? ((data?.video?.spec as VideoProps | null) ?? null) : null;
}
