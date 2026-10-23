// The stills for the storyboard's scene beats: each "what the camera sees" line becomes its own
// cinematic image, in the same photographic style as the kit's background, so the video cuts between
// real moments of the field instead of returning to one picture.
import { z } from "zod";
import { structured } from "../ai/claude";
import { generateScene } from "../agent/assets";
import type { Beat } from "./storyboard";

const promptsSchema = z.object({
  prompts: z.array(z.string()).describe("one English image prompt per shot, in the same order"),
});

/** English prompts for the shots, carrying the kit's look (from its background prompt). */
async function prompts(shots: string[], style: string, palette: string[]) {
  const out = await structured({
    schema: promptsSchema,
    effort: "low",
    maxTokens: 3000,
    system: `You turn a video director's shot notes (Hebrew) into prompts for a photographic image model. Each prompt: the concrete moment described, framed for a vertical 9:16 phone video, cinematic photography, "35mm, shallow depth of field, film grain", lighting and colour in the look of the style reference and the palette. No text, letters, logos or watermarks in the image. People may appear only as hands, silhouettes, or from behind, never a recognisable face (the lecturer is a real person and is shown from their own photo).`,
    messages: [{ role: "user", content: JSON.stringify({ style, palette, shots }) }],
  });
  return shots.map((s, i) => out.prompts[i] ?? `${s}, ${style}`);
}

/** Image URL for each scene beat that has a shot (by beat id). A failed still falls back to the kit's own scene. */
export async function shotImages(beats: Beat[], style: string, palette: string[], folder: string): Promise<Record<string, string>> {
  const wanted = beats.filter((b) => b.visual === "scene" && b.shot?.trim()).slice(0, 6);
  if (!wanted.length) return {};
  const list = await prompts(
    wanted.map((b) => b.shot.trim()),
    style,
    palette,
  );
  const urls = await Promise.all(
    wanted.map((b, i) => generateScene(list[i], "9:16", `${folder}/shot-${b.id}.jpg`).catch((e) => (console.error("[shot]", e), null))),
  );
  return Object.fromEntries(wanted.flatMap((b, i) => (urls[i] ? [[b.id, urls[i]]] : [])));
}
