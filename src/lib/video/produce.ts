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
import type { Brief } from "../agent/brief";
import { renderSandbox } from "../render/sandbox";
import { createAdminClient } from "../supabase/admin";
import { compose, speak, type VoiceKey } from "./audio";
import { writeVideoScript } from "./script";
import { prepareSpeech } from "./speech";

// Shortest a scene may run, so the visual has time to land even when the line is short.
const MIN_SECONDS: Record<Scene["type"], number> = {
  cover: 3.4,
  hero: 3,
  hook: 3,
  bullets: 4.2,
  props: 3,
  cta: 3.2,
};

export async function produceVideo(opts: {
  videoId: string;
  userId: string;
  kitId: string;
  kind: "promo" | "marketing";
  voice: VoiceKey;
  brief: Brief | null;
  design: DesignProps;
  cover: string;
}) {
  const db = createAdminClient();
  const set = (patch: Record<string, unknown>) =>
    db.from("videos").update(patch).eq("id", opts.videoId);
  const folder = `${opts.userId}/${opts.kitId}/videos/${opts.videoId}`;

  try {
    const script = await writeVideoScript(opts.kind, opts.brief, opts.design);
    await set({ status: "voicing" });

    // One line at a time: ElevenLabs refuses parallel requests on a library voice it is still
    // attaching to the account (409), and the lines are short.
    // Vowel points where the reading is ambiguous (switch off with SPEECH_NIQQUD=0).
    const spoken =
      process.env.SPEECH_NIQQUD !== "0"
        ? await prepareSpeech(script.scenes.map((s) => s.voice))
        : script.scenes.map((s) => s.voice);
    const voiced: Scene[] = [];
    for (const [i, s] of script.scenes.entries()) {
      voiced.push(
        await (async () => {
          const v = await speak(spoken[i], s.voice, opts.voice, `${folder}/vo-${i}.mp3`);
          const seconds = Math.max(MIN_SECONDS[s.type], v.seconds + 0.55);
          return {
            type: s.type,
            voice: s.voice,
            emphasis: s.emphasis,
            audio: v.url,
            words: v.words,
            durationInFrames: Math.ceil(seconds * FPS),
          } satisfies Scene;
        })(),
      );
    }
    const total = videoDuration(voiced) / FPS;
    const music = await compose(
      script.musicPrompt,
      total + 1,
      `${folder}/music.mp3`,
    );

    const spec: VideoProps = {
      kind: opts.kind,
      design: opts.design,
      cover: opts.cover,
      scenes: voiced,
      music,
      captions: true,
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
      const path = `${folder}/${opts.kind}.mp4`;
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
    console.error("[video]", e);
    await set({
      status: "failed",
      error: String((e as Error).message ?? e).slice(0, 500),
    });
  }
}
