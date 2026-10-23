// Produces a video end to end: script → narration per scene (timed words) → music → render in
// the cloud → stored MP4. Progress is written to the videos row so the studio can show it.
import { renderMediaOnVercel } from "@remotion/vercel";
import type { DesignProps } from "@/engine/design";
import {
  FPS,
  videoDuration,
  type Scene,
  type VideoProps,
} from "@/engine/video/schema";
import { renderSandbox } from "../render/sandbox";
import { refund } from "../credits";
import { createAdminClient } from "../supabase/admin";
import { compose, speak, type VoiceKey } from "./audio";
import type { Beat, Storyboard } from "./storyboard";
import { prepareSpeech } from "./speech";
import { alertOwner } from "../alert";

// Shortest a scene may run, so the visual has time to land even when the line is short.
const MIN_SECONDS: Record<Scene["type"], number> = {
  cover: 3.4,
  hero: 3,
  hook: 3,
  bullets: 4.2,
  props: 3,
  cta: 3.2,
};

// Until the beat-based editing engine lands, each beat plays as the scene closest to its role.
const SCENE_FOR: Record<Beat["role"], Scene["type"]> = {
  hook: "hook",
  pain: "hook",
  intro: "cover",
  solution: "cover",
  lecturer: "hero",
  proof: "hero",
  glimpse: "hero",
  outcomes: "bullets",
  offer: "cta",
  cta: "cta",
};
const sceneFor = (b: Beat): Scene["type"] =>
  b.visual === "list" ? "bullets" : b.visual === "props" ? "props" : b.visual === "cover" ? "cover" : b.visual === "lecturer" && SCENE_FOR[b.role] === "hook" ? "hero" : SCENE_FOR[b.role];

export async function produceVideo(opts: {
  videoId: string;
  userId: string;
  kitId: string;
  storyboard: Storyboard; // approved by the user: produced exactly as written
  voice: VoiceKey;
  design: DesignProps;
  cover: string;
  cost: number; // credits to give back if the production fails
}) {
  const db = createAdminClient();
  const set = (patch: Record<string, unknown>) =>
    db.from("videos").update(patch).eq("id", opts.videoId);
  const folder = `${opts.userId}/${opts.kitId}/videos/${opts.videoId}`;

  try {
    const beats = opts.storyboard.beats;
    await set({ status: "voicing" });

    // One line at a time: ElevenLabs refuses parallel requests on a library voice it is still
    // attaching to the account (409), and the lines are short.
    // Vowel points where the reading is ambiguous, if switched on (SPEECH_NIQQUD=1). Off by
    // default: v4 reads plain Hebrew well, and the script review already removes ambiguous words.
    const spoken =
      process.env.SPEECH_NIQQUD === "1"
        ? await prepareSpeech(beats.map((b) => b.voice))
        : beats.map((b) => b.voice);
    const voiced: Scene[] = [];
    for (const [i, b] of beats.entries()) {
      voiced.push(
        await (async () => {
          const type = sceneFor(b);
          const v = await speak(spoken[i], b.voice, opts.voice, `${folder}/vo-${i}.mp3`);
          const seconds = Math.max(MIN_SECONDS[type], v.seconds + 0.55);
          return {
            type,
            voice: b.voice,
            emphasis: b.emphasis.filter((w) => b.voice.includes(w)),
            title: b.title || undefined,
            sub: b.sub || undefined,
            items: b.items.length ? b.items : undefined,
            audio: v.url,
            words: v.words,
            durationInFrames: Math.ceil(seconds * FPS),
          } satisfies Scene;
        })(),
      );
    }
    const total = videoDuration(voiced) / FPS;
    const music = await compose(
      opts.storyboard.music,
      total + 1,
      `${folder}/music.mp3`,
    );

    const spec: VideoProps = {
      kind: opts.storyboard.kind,
      design: opts.design,
      cover: opts.cover,
      scenes: voiced,
      music,
      captions: opts.storyboard.captions !== "off",
    };
    await set({ status: "rendering", spec });

    const sandbox = await renderSandbox();
    try {
      const { sandboxFilePath } = await renderMediaOnVercel({
        sandbox,
        compositionId: "video",
        inputProps: spec as unknown as Record<string, unknown>,
        codec: "h264",
        crf: 20,
        timeoutInMilliseconds: 600_000,
      });
      const data = await sandbox.readFileToBuffer({ path: sandboxFilePath });
      if (!data) throw new Error("render produced no file");
      const path = `${folder}/${opts.storyboard.kind}.mp4`;
      const { error } = await db.storage
        .from("kit-assets")
        .upload(path, data, { contentType: "video/mp4", upsert: true });
      if (error) throw new Error(`storage: ${error.message}`);
      const url = db.storage.from("kit-assets").getPublicUrl(path)
        .data.publicUrl;
      await set({ status: "ready", url });
    } finally {
      await sandbox.stop().catch(() => {});
    }
  } catch (e) {
    await alertOwner("video:failed", "הפקת סרטון נכשלה (הקרדיטים הוחזרו ללקוח)", { video: opts.videoId, kit: opts.kitId, error: (e as Error).message });
    if (opts.cost) await refund(opts.userId, opts.cost, opts.videoId);
    // The free plan's one sample video: a failed one doesn't count.
    else await db.from("accounts").update({ free_video_used: false }).eq("user_id", opts.userId);
    await set({
      status: "failed",
      error: String((e as Error).message ?? e).slice(0, 500),
    });
  }
}
