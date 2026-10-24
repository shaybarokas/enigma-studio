"use client";

// The video editor's live preview: the same composition the cloud renders, played in the browser
// with every edit applied at once. Loaded on the client only (see design-preview-lazy).
import { Player, type PlayerRef } from "@remotion/player";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type Ref } from "react";
import { prefetch } from "remotion";
import { videoDuration, type VideoProps } from "@/engine/video/schema";
import { VideoComposition } from "@/engine/video/video";

/** Every file the video plays or shows (narration, music, footage, pictures). */
const mediaOf = (spec: VideoProps): string[] => {
  const out = new Set<string>();
  const walk = (v: unknown) => {
    if (typeof v === "string") {
      if (/^https?:/i.test(v)) out.add(v);
    } else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object")
      for (const [k, x] of Object.entries(v)) if (k !== "from") walk(x); // `from` is the whole lesson a cut came from
  };
  walk(spec);
  return [...out];
};

// On a phone the preview is small: the device's own buttons set the volume, which leaves the
// player's controls room for the time.
const narrow = "(max-width: 767px)";
const subscribe = (on: () => void) => {
  const m = matchMedia(narrow);
  m.addEventListener("change", on);
  return () => m.removeEventListener("change", on);
};
const useNarrow = () => useSyncExternalStore(subscribe, () => matchMedia(narrow).matches, () => false);

export function VideoPreview({ spec, ref }: { spec: VideoProps; ref?: Ref<PlayerRef> }) {
  // The media is downloaded before playing, so the preview doesn't stop to buffer along the way.
  // Files stay loaded while the editor is open (edits rarely add new ones).
  const urls = useMemo(() => mediaOf(spec), [spec]);
  const loaded = useRef(new Map<string, ReturnType<typeof prefetch>>());
  const [done, setDone] = useState(0);
  useEffect(() => {
    const fresh = urls.filter((u) => !loaded.current.has(u));
    for (const u of fresh) {
      const handle = prefetch(u, { method: "blob-url" });
      loaded.current.set(u, handle);
      handle.waitUntilDone().then(
        () => setDone((n) => n + 1),
        () => setDone((n) => n + 1), // a file that fails to load streams as usual
      );
    }
  }, [urls]);
  useEffect(() => {
    const all = loaded.current;
    return () => all.forEach((h) => h.free());
  }, []);
  const loading = done < urls.length;
  const small = useNarrow();

  // The player positions its canvas with left offsets; in an RTL page that throws it off-screen.
  return (
    <div dir="ltr" className="relative overflow-hidden rounded-2xl">
      <Player
        ref={ref}
        component={VideoComposition}
        inputProps={spec}
        durationInFrames={Math.max(30, videoDuration(spec.scenes))}
        compositionWidth={1080}
        compositionHeight={1920}
        fps={30}
        controls
        showVolumeControls={!small}
        style={{ width: "100%", aspectRatio: "9 / 16" }}
        acknowledgeRemotionLicense
      />
      {loading && (
        <div dir="rtl" role="status" className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-center gap-2 bg-black/60 py-2 text-xs font-semibold text-white">
          <span className="size-3 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />
          טוען את התצוגה… {Math.round((done / urls.length) * 100)}%
        </div>
      )}
    </div>
  );
}
