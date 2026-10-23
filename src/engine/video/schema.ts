// A produced video: the kit's design plus the approved storyboard's beats, each with its narration
// audio, the timing of every spoken word (for the captions), what is on screen, where the camera cuts
// inside it and how it hands over to the next beat.
import { z } from "zod";
import { BEAT_ROLES, CAPTION_STYLES, VISUALS } from "../../lib/video/storyboard-ui";
import { designSchema } from "../design";

export const FPS = 30;

/** How a beat hands over to the next: a hard cut on the music, or a moving transition. */
export const TRANSITIONS = ["cut", "whip", "zoom", "flash", "fade"] as const;
export type TransitionKind = (typeof TRANSITIONS)[number];
export const TRANSITION_FRAMES: Record<TransitionKind, number> = { cut: 0, whip: 10, zoom: 10, flash: 8, fade: 14 };

export const wordSchema = z.object({ text: z.string(), start: z.number(), end: z.number() }); // seconds within the scene

export const sceneSchema = z.object({
  role: z.enum(BEAT_ROLES),
  visual: z.enum(VISUALS),
  voice: z.string(), // the narration line, Hebrew
  emphasis: z.array(z.string()).default([]), // words painted in the accent colour
  title: z.string().default(""),
  sub: z.string().default(""),
  items: z.array(z.string()).default([]),
  image: z.string().optional(), // this beat's own still (scene beats)
  motion: z.string().optional(), // the still brought to life as an AI video clip (scene beats the user chose)
  clip: z
    .object({
      src: z.string(),
      start: z.number(), // seconds into the clip
      aspect: z.number(), // its width / height
      audio: z.boolean(), // the lecturer's own words are heard (no narration over it)
      rate: z.number().default(1), // playback speed, slowed a little when the line outlasts the span
      x: z.number().default(0.5), // where the speaker stands across the frame (0–1): wide footage is cropped around them
    })
    .optional(), // footage from the course
  // The picture the camera cuts away to in the middle of the beat (b-roll): a still of its own, or a
  // moment of the course's footage.
  insert: z
    .object({ image: z.string().optional(), clip: z.object({ src: z.string(), start: z.number(), aspect: z.number(), x: z.number().default(0.5) }).optional() })
    .optional(),
  audio: z.string().optional(),
  lead: z.number().default(0), // frames of picture before the narration starts
  words: z.array(wordSchema).default([]), // seconds from the scene's start (lead included)
  durationInFrames: z.number(),
  cuts: z.array(z.number()).default([]), // camera cuts inside the beat (frames from its start): each starts a new angle
  calm: z.boolean().default(false), // set in the video editor: no camera moves, cuts or punch-ins in this beat
  transition: z.enum(TRANSITIONS).default("cut"), // into the next beat
});
export type Scene = z.infer<typeof sceneSchema>;

export const sfxSchema = z.object({ whoosh: z.string(), impact: z.string(), riser: z.string(), pop: z.string(), shimmer: z.string() });

export const videoSchema = z.object({
  kind: z.enum(["promo", "marketing"]),
  design: designSchema,
  cover: z.string(), // the kit's cover template id
  scenes: z.array(sceneSchema),
  music: z.string().optional(),
  captions: z.enum(CAPTION_STYLES).default("bold"),
  musicVolume: z.number().min(0).max(2).default(1), // the editor's music level (1 = as mixed)
  sfx: sfxSchema.optional(),
  // The kit's scene blurred ahead of time (soft: behind the lecturer; deep: behind lists and cards):
  // a CSS blur redrawn on every frame would slow the render several times over.
  backdrops: z.object({ soft: z.string(), deep: z.string() }).optional(),
});
export type VideoProps = z.infer<typeof videoSchema>;

/** Total length: scenes overlap during each moving transition. */
export function videoDuration(scenes: Pick<Scene, "durationInFrames" | "transition">[]): number {
  const sum = scenes.reduce((a, s) => a + s.durationInFrames, 0);
  const overlap = scenes.slice(0, -1).reduce((a, s) => a + TRANSITION_FRAMES[s.transition], 0);
  return Math.max(FPS, sum - overlap);
}

/** Where each scene starts in the video, in frames. */
export function sceneStarts(scenes: Pick<Scene, "durationInFrames" | "transition">[]): number[] {
  const starts: number[] = [];
  let at = 0;
  for (const s of scenes) {
    starts.push(at);
    at += s.durationInFrames - TRANSITION_FRAMES[s.transition];
  }
  return starts;
}
