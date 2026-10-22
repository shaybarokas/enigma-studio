"use client";

// The kit's videos: pick a kind and a narrator, then watch the production move through its steps.
import { useEffect, useState } from "react";
import { DEFAULT_VOICE, VOICES, VOICE_KEYS } from "@/lib/video/voices";
import { paywalled, refreshAccount, useAccount } from "@/components/account";
import { COST, PLANS } from "@/lib/plans";

type Video = { id: string; kind: "promo" | "marketing"; voice: string; status: string; url: string | null; error: string | null; created_at: string };

const KINDS = {
  promo: { name: "סרטון פרומו", note: "טריילר לקורס: על מה הוא ומי מלמד, כמו פרומו לסרט" },
  marketing: { name: "סרטון שיווק", note: "פתיחה שעוצרת גלילה, הכאב, הפתרון והנעה לפעולה" },
} as const;

const STEPS: Record<string, string> = {
  writing: "כותב תסריט…",
  voicing: "מקליט קריינות ומלחין מוזיקה…",
  rendering: "מרנדר את הסרטון בענן…",
};

export function Videos({ kitId }: { kitId: string }) {
  const [videos, setVideos] = useState<Video[] | null>(null);
  const [voice, setVoice] = useState<string>(DEFAULT_VOICE);
  const [starting, setStarting] = useState<string | null>(null);
  const [error, setError] = useState("");

  const account = useAccount();
  const paid = account ? PLANS[account.plan].videos : false;
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
    const res = await fetch(`/api/kits/${kitId}/videos`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, voice }) });
    const data = await res.json().catch(() => ({}));
    setStarting(null);
    if (paywalled(res, data)) return;
    if (!res.ok) return setError(data.error ?? "ההפקה לא התחילה");
    setVideos((v) => [data.video, ...(v ?? [])]);
  };

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-xl font-black">סרטונים</h2>
        <p className="text-sm text-muted">בגודל סטורי, עם קריינות בעברית, כתוביות ומוזיקה מקורית. כל סרטון לוקח כ־3 דקות.</p>
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

      <div className="space-y-3 rounded-3xl border border-border bg-surface p-5">
        <p className="text-sm font-bold">הקול של הסרטון</p>
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="קריין">
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
                {account && !paid && (account.freeVideoUsed || k !== "promo") ? "🔒" : "🎬"} {starting === k ? "מתחיל…" : `הפקת ${KINDS[k].name}`}
              </span>
              <span className="block text-sm text-white/80">{KINDS[k].note}</span>
            </button>
          ))}
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
      </div>

      {videos && videos.length > 0 && (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {videos.map((v) => (
            <li key={v.id} className="overflow-hidden rounded-2xl border border-border bg-surface">
              <div className="relative aspect-[9/16] bg-black">
                {v.status === "ready" && v.url ? (
                  <video src={v.url} controls playsInline preload="metadata" className="h-full w-full object-contain" />
                ) : v.status === "failed" ? (
                  <div className="flex h-full items-center justify-center p-4 text-center text-sm text-danger">ההפקה נכשלה. אפשר לנסות שוב.</div>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-4 p-4 text-center">
                    <div className="size-12 animate-spin rounded-full border-4 border-white/20 border-t-neon" aria-hidden />
                    <p className="text-sm font-bold text-white" aria-live="polite">
                      {STEPS[v.status] ?? "בהפקה…"}
                    </p>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between gap-2 p-3">
                <div>
                  <p className="text-sm font-bold">{KINDS[v.kind].name}</p>
                  <p className="text-xs text-muted">קול: {VOICES[v.voice as keyof typeof VOICES]?.name ?? v.voice}</p>
                </div>
                {v.status === "ready" && v.url && (
                  <a href={`${v.url}?download=${encodeURIComponent(`${KINDS[v.kind].name}.mp4`)}`} className="rounded-full bg-brand px-3 py-1.5 text-xs font-bold text-white hover:bg-brand-strong">
                    ⬇ הורדה
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
