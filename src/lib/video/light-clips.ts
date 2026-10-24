// The moments of course footage a video uses, each cut into a short H.264 file that starts playing at
// once in any browser. A course clip is a whole recorded lesson (often hundreds of MB, sometimes HEVC
// with its index at the end): the cloud renderer copes, but the video editor's preview has to seek
// into it in the viewer's browser, which is slow everywhere and black where HEVC isn't supported.
// Runs before every render; a moment is always cut from its original lesson (kept in `from`), so a
// beat that grew longer gets a longer cut. When the lesson is gone (clips expire), the cut stays.
import type { VideoProps } from "@/engine/video/schema";
import { createAdminClient } from "../supabase/admin";

const BEFORE = 1; // seconds kept before the moment
const SPARE = 2; // seconds kept after the beat

/** Cuts `seconds` of `src` from `from`; returns the MP4. */
export type Cutter = (src: string, from: number, seconds: number) => Promise<Buffer>;

export const cutArgs = (src: string, from: number, seconds: number, out: string) => [
  "-hide_banner", "-v", "error", "-y",
  "-ss", from.toFixed(3), "-i", src, "-t", seconds.toFixed(3),
  "-vf", "scale=-2:'min(1080,ih)'",
  "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p",
  "-c:a", "aac", "-b:a", "160k",
  "-movflags", "+faststart", out,
];

type Moment = { src: string; start: number; from?: { src: string; start: number } };

export async function lightenClips(spec: VideoProps, folder: string, cut: Cutter): Promise<VideoProps> {
  const storage = createAdminClient().storage.from("kit-assets");
  const light = async <M extends Moment>(m: M, seconds: number, name: string): Promise<M> => {
    const origin = m.from ?? { src: m.src, start: m.start };
    const from = Math.max(0, origin.start - BEFORE);
    try {
      const data = await cut(origin.src, from, origin.start - from + seconds + SPARE);
      const path = `${folder}/cuts/${name}.mp4`;
      const { error } = await storage.upload(path, data, { contentType: "video/mp4", upsert: true });
      if (error) throw new Error(error.message);
      // A fresh address each time, so browsers don't play a cut they cached for an earlier version.
      const url = `${storage.getPublicUrl(path).data.publicUrl}?v=${Date.now().toString(36)}`;
      return { ...m, src: url, start: origin.start - from, from: origin };
    } catch (e) {
      console.warn("[light-clips]", name, (e as Error).message);
      return m; // the render still works from the original
    }
  };
  const scenes = await Promise.all(
    spec.scenes.map(async (s, i) => {
      const seconds = (s.durationInFrames / 30) * (s.clip?.rate ?? 1) + 1.5; // the first beat starts a little in
      const [clip, insert] = await Promise.all([
        s.clip ? light(s.clip, seconds, `${i + 1}-clip`) : undefined,
        s.insert?.clip ? light(s.insert.clip, s.durationInFrames / 30, `${i + 1}-insert`) : undefined,
      ]);
      return { ...s, ...(clip ? { clip } : {}), ...(insert && s.insert ? { insert: { ...s.insert, clip: insert } } : {}) };
    }),
  );
  return { ...spec, scenes };
}
