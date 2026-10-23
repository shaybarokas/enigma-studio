// What a video is made of, before it is rendered: the narration of every beat, the beats' own
// stills, the edit (timing, inner cuts, transitions), the music and the sound effects.
import sharp from "sharp";
import type { DesignProps } from "@/engine/design";
import { storeUpload } from "../agent/assets";
import { FPS, videoDuration, type VideoProps } from "@/engine/video/schema";
import { compose, speak, type VoiceKey } from "./audio";
import { wordsIn } from "./clips";
import { edit, type Voiced } from "./edit";
import { soundEffects } from "./sfx";
import { animateShot, shotImages } from "./shots";
import { prepareSpeech } from "./speech";
import type { Storyboard } from "./storyboard";
import type { CourseClip } from "./storyboard-ui";

export type Production = {
  videoId: string;
  userId: string;
  kitId: string;
  storyboard: Storyboard; // approved by the user: produced exactly as written
  voice: VoiceKey;
  design: DesignProps;
  cover: string;
  clips: CourseClip[]; // the kit's course footage, for clip beats
  style: string; // the kit's photographic look (its background prompt), for the beats' own stills
  cost: number; // credits to give back if the production fails
};

/** The kit's tall scene blurred once, at two depths (see VideoProps.backdrops). */
async function backdrops(design: DesignProps, folder: string) {
  try {
    const src = design.assets.backgroundTall ?? design.assets.background;
    const res = await fetch(src);
    if (!res.ok) throw new Error(`download ${res.status}`);
    const img = sharp(Buffer.from(await res.arrayBuffer())).resize(1080, 1920, { fit: "cover" });
    const [soft, deep] = await Promise.all(
      ([["soft", 6], ["deep", 32]] as const).map(async ([name, sigma]) =>
        storeUpload(`${folder}/backdrop-${name}.jpg`, await img.clone().blur(sigma).jpeg({ quality: 85 }).toBuffer(), "image/jpeg"),
      ),
    );
    return { soft, deep };
  } catch (e) {
    console.error("[backdrops]", e);
    return undefined; // the shots fall back to a CSS blur
  }
}

/** Everything the render needs: narration, the beats' stills, the edit, music and sound effects. */
export async function prepareVideo(
  opts: Omit<Production, "cost">,
  onStep: (status: "voicing") => PromiseLike<unknown> = async () => {},
): Promise<VideoProps> {
  const folder = `${opts.userId}/${opts.kitId}/videos/${opts.videoId}`;
  const beats = opts.storyboard.beats;
  await onStep("voicing");

  // Vowel points where the reading is ambiguous, if switched on (SPEECH_NIQQUD=1). Off by
  // default: v4 reads plain Hebrew well, and the script review already removes ambiguous words.
  const spoken =
    process.env.SPEECH_NIQQUD === "1"
      ? await prepareSpeech(beats.map((b) => b.voice))
      : beats.map((b) => b.voice);
  // The backdrops, the beats' stills (and the AI clips made from them) and the sound effects are
  // made while the voice records.
  const motionPath = (id: string) => `${folder}/motion-${id}.mp4`;
  const visuals = Promise.all([
    backdrops(opts.design, folder),
    shotImages(beats, opts.style, Object.values(opts.design.brand.palette), folder).then(async (stills) => {
      const moving = await Promise.all(
        beats.map((b) => (b.visual === "scene" && b.motion && stills[b.id] ? animateShot(stills[b.id].url, stills[b.id].prompt, motionPath(b.id)) : null)),
      );
      return { images: Object.fromEntries(Object.entries(stills).map(([id, x]) => [id, x.url])), motion: Object.fromEntries(beats.flatMap((b, i) => (moving[i] ? [[b.id, moving[i]]] : []))) };
    }),
    soundEffects(),
  ]);
  // One line at a time: ElevenLabs refuses parallel requests on a library voice it is still
  // attaching to the account (409), and the lines are short. A clip that speaks for itself needs no voice.
  const voiced: (Voiced & { audio?: string })[] = [];
  for (const [i, b] of beats.entries()) {
    const clip = b.visual === "clip" ? opts.clips.find((c) => c.id === b.clipId) : undefined;
    if (clip && b.clipAudio) {
      voiced.push({ beat: b, clip, seconds: b.clipEnd - b.clipStart, words: wordsIn(clip, b.clipStart, b.clipEnd) });
      continue;
    }
    const v = await speak(spoken[i], b.voice, opts.voice, `${folder}/vo-${i}.mp3`);
    voiced.push({ beat: b, clip, seconds: v.seconds, words: v.words, audio: v.url });
  }
  const [blurred, { images, motion }, sfx] = await visuals;
  for (const v of voiced) v.motion = motion[v.beat.id];
  const scenes = edit(opts.storyboard.kind, voiced, opts.storyboard.music, images).map((s, i) => ({ ...s, audio: voiced[i].audio }));
  const music = await compose(
    opts.storyboard.music,
    videoDuration(scenes) / FPS + 1,
    `${folder}/music.mp3`,
  );
  return {
    kind: opts.storyboard.kind,
    design: opts.design,
    cover: opts.cover,
    scenes,
    music,
    captions: opts.storyboard.captions,
    sfx,
    backdrops: blurred,
  };
}
