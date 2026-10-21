// A produced video: the kit's design plus a sequence of scenes, each with its narration line,
// its audio and the timing of every spoken word (for the kinetic captions).
import { z } from "zod";
import { designSchema } from "../design";

export const FPS = 30;
export const TRANSITION_FRAMES = 12;

export const SCENE_TYPES = ["cover", "hero", "hook", "bullets", "props", "cta"] as const;
export type SceneType = (typeof SCENE_TYPES)[number];

export const wordSchema = z.object({ text: z.string(), start: z.number(), end: z.number() }); // seconds within the scene

export const sceneSchema = z.object({
  type: z.enum(SCENE_TYPES),
  voice: z.string(), // the narration line, Hebrew
  emphasis: z.array(z.string()).default([]), // words painted in the accent colour
  audio: z.string().optional(),
  words: z.array(wordSchema).default([]),
  durationInFrames: z.number(),
});
export type Scene = z.infer<typeof sceneSchema>;

export const videoSchema = z.object({
  kind: z.enum(["promo", "marketing"]),
  design: designSchema,
  cover: z.string(), // the kit's cover template id
  scenes: z.array(sceneSchema),
  music: z.string().optional(),
  captions: z.boolean().default(true),
});
export type VideoProps = z.infer<typeof videoSchema>;

/** Total length: scenes overlap during each transition. */
export function videoDuration(scenes: { durationInFrames: number }[]): number {
  const sum = scenes.reduce((a, s) => a + s.durationInFrames, 0);
  return Math.max(FPS, sum - TRANSITION_FRAMES * Math.max(0, scenes.length - 1));
}
