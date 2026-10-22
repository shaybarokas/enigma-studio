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
  watermark: z.boolean().optional(), // free plan: "made with Enigma Studio" on every output
});
export type DesignProps = z.infer<typeof designSchema>;

/** "אני יודע|שאתה משקר!" → ["אני יודע", "שאתה משקר!"]; no "|" puts it all in ink. */
export function splitHeadline(h: string): [string, string] {
  const i = h.indexOf("|");
  return i < 0 ? [h, ""] : [h.slice(0, i).trim(), h.slice(i + 1).trim()];
}

/**
 * Editor overrides are stored per output ("ad-hook|story|headline": moved in the story ad only) or
 * for every output ("headline"). Templates read plain element ids, so each render gets the
 * overrides of its own template and format merged in.
 */
export function overrideKey(template: string, format: string, el: string) {
  return `${template}|${format}|${el}`;
}

export function forView(design: DesignProps, template: string, format: string): DesignProps {
  const global: DesignProps["overrides"] = {};
  const local: DesignProps["overrides"] = {};
  for (const [key, t] of Object.entries(design.overrides ?? {})) {
    const parts = key.split("|");
    if (parts.length === 1) global[key] = t;
    else if (parts[0] === template && parts[1] === format) local[parts[2]] = t;
  }
  // Sizes multiply ("headline 20% bigger everywhere" × "a bit smaller in the story"); the rest of
  // the output's own edits win.
  const merged: DesignProps["overrides"] = {};
  for (const el of new Set([...Object.keys(global), ...Object.keys(local)])) {
    const g = global[el] ?? {};
    const l = local[el] ?? {};
    merged[el] = { ...g, ...l, scale: (g.scale ?? 1) * (l.scale ?? 1) };
  }
  return { ...design, overrides: merged };
}

/** Hebrew names for the elements the editor can select. */
export const ELEMENT_NAMES: Record<string, string> = {
  subject: "המרצה",
  wordmark: "שם המותג",
  subtitle: "ההבטחה",
  headline: "הכותרת",
  cta: "כפתור ההנעה",
  bullets: "הרשימה",
  tags: "התגיות",
  prop0: "אביזר 1",
  prop1: "אביזר 2",
  prop2: "אביזר 3",
  prop3: "אביזר 4",
  prop4: "אביזר 5",
};
