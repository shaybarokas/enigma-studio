// The content every template reads. One shape for all templates, so switching a template, size or
// concept keeps the user's copy, assets and edits.
import { z } from "zod";
import { brandSchema, transformSchema } from "./types";

export const copySchema = z.object({
  wordmark: z.array(z.string()).min(1).max(3), // brand-name lines: ["BRICK", "BOSS"]
  kicker: z.string(), // short line above the promise
  headline: z.string(), // big Hebrew hook; "|" splits ink from accent: "אני יודע|שאתה משקר!"
  subtitle: z.string(), // the promise
  bullets: z.array(z.string()).max(6).default([]), // what's inside / outcomes
  tags: z.array(z.string()).max(3).default([]), // small pills: "שוק ההון", "קריפטו"
  cta: z.string().default("להרשמה"),
  price: z.string().optional(), // "₪649"
  lecturer: z.string().optional(), // "אבי כהן · 20 שנה בנדל״ן"
});
export type Copy = z.infer<typeof copySchema>;

const imageSchema = z.object({ src: z.string(), aspect: z.number() }); // aspect = width / height

export const assetsSchema = z.object({
  background: z.string(), // wide scene
  backgroundTall: z.string().optional(), // tall scene for 3:4 and story
  subject: imageSchema.optional(), // lecturer cut-out, cropped tight
  props: z.array(imageSchema).max(6).default([]), // cut-out objects from the course's world
  logo: z.string().optional(),
});
export type Assets = z.infer<typeof assetsSchema>;

export const designSchema = z.object({
  brand: brandSchema,
  copy: copySchema,
  assets: assetsSchema,
  subjectSide: z.enum(["left", "right"]).default("left"),
  overrides: z.record(z.string(), transformSchema.partial()).default({}),
});
export type DesignProps = z.infer<typeof designSchema>;

/** "אני יודע|שאתה משקר!" → ["אני יודע", "שאתה משקר!"]; no "|" puts it all in ink. */
export function splitHeadline(h: string): [string, string] {
  const i = h.indexOf("|");
  return i < 0 ? [h, ""] : [h.slice(0, i).trim(), h.slice(i + 1).trim()];
}
