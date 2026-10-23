// A new version of a finished video, from the video editor: its spec as edited, the narration lines
// the user rewrote recorded again (their beats re-timed to the new line), music composed again only
// when the video grew longer than its track, then the render. Everything else is reused as it is.
import { FPS, TRANSITION_FRAMES, videoDuration, type VideoProps } from "@/engine/video/schema";
import { alertOwner } from "../alert";
import { refund } from "../credits";
import { createAdminClient } from "../supabase/admin";
import { compose, speak, type VoiceKey } from "./audio";
import { renderToStorage } from "./produce";
import type { Revoice } from "./video-edits";

/** Every media URL in an edited spec must be one of ours (the editor sends the spec back to us). */
export function ownMediaOnly(spec: unknown): boolean {
  const ours = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/`;
  const walk = (v: unknown): boolean =>
    typeof v === "string" ? !/^https?:/i.test(v) || v.startsWith(ours) : Array.isArray(v) ? v.every(walk) : v && typeof v === "object" ? Object.values(v).every(walk) : true;
  return walk(spec);
}

export async function produceVersion(o: {
  videoId: string;
  userId: string;
  kitId: string;
  spec: VideoProps;
  revoice: Revoice[];
  voice: VoiceKey;
  musicPrompt: string | null;
  musicSeconds: number; // the length the current track was composed for
  cost: number;
}) {
  const db = createAdminClient();
  const set = (patch: Record<string, unknown>) => db.from("videos").update(patch).eq("id", o.videoId);
  const folder = `${o.userId}/${o.kitId}/videos/${o.videoId}`;
  try {
    let spec = o.spec;
    if (o.revoice.length) {
      await set({ status: "voicing" });
      const scenes = [...spec.scenes];
      for (const r of o.revoice) {
        const i = r.scene - 1;
        const s = scenes[i];
        if (!s) continue;
        const v = await speak(r.text, r.text, o.voice, `${folder}/vo-edit-${i}.mp3`);
        const lead = s.lead ?? 0;
        const speechEnd = lead + Math.ceil(v.seconds * FPS);
        const needed = speechEnd + Math.round(FPS * (s.role === "cta" ? 1.4 : 0.3)) + TRANSITION_FRAMES[s.transition];
        scenes[i] = {
          ...s,
          voice: r.text,
          audio: v.url,
          words: v.words.map((w) => ({ ...w, start: w.start + lead / FPS, end: w.end + lead / FPS })),
          emphasis: s.emphasis.filter((w) => r.text.includes(w)),
          durationInFrames: Math.max(Math.round(FPS * 2.2), needed),
          cuts: s.cuts.filter((c) => c < speechEnd - FPS),
        };
      }
      spec = { ...spec, scenes };
    }
    // A longer video needs a longer track; otherwise the one it has still fits (it fades at the end).
    const seconds = videoDuration(spec.scenes) / FPS;
    if (o.musicPrompt && seconds > o.musicSeconds - 0.5) spec = { ...spec, music: await compose(o.musicPrompt, seconds + 1, `${folder}/music.mp3`) };
    await set({ status: "rendering", spec });
    await set({ status: "ready", url: await renderToStorage(spec, `${folder}/${spec.kind}.mp4`) });
  } catch (e) {
    await alertOwner("video:failed", "גרסה ערוכה של סרטון נכשלה (הקרדיטים הוחזרו)", { video: o.videoId, kit: o.kitId, error: (e as Error).message });
    if (o.cost) await refund(o.userId, o.cost, o.videoId);
    await set({ status: "failed", error: String((e as Error).message ?? e).slice(0, 500) });
  }
}
