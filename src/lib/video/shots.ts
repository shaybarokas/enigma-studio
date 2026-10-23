// The stills for the storyboard's scene beats: each "what the camera sees" line becomes its own
// cinematic image, in the same photographic style as the kit's background, so the video cuts between
// real moments of the field instead of returning to one picture.
import { z } from "zod";
import { structured } from "../ai/claude";
import { generateScene } from "../agent/assets";
import { createAdminClient } from "../supabase/admin";
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

/** Each scene beat's still (by beat id), with the prompt it was made from. A failed still falls back
 * to the kit's own scene. */
export async function shotImages(beats: Beat[], style: string, palette: string[], folder: string): Promise<Record<string, { url: string; prompt: string }>> {
  // Scene beats first (their main picture), then the cut-aways of other beats.
  const has = (b: Beat) => Boolean(b.shot?.trim()) && !["list", "logo", "clip"].includes(b.visual) && b.role !== "cta";
  const wanted = [...beats.filter((b) => has(b) && b.visual === "scene"), ...beats.filter((b) => has(b) && b.visual !== "scene")].slice(0, 8);
  if (!wanted.length) return {};
  const list = await prompts(
    wanted.map((b) => b.shot.trim()),
    style,
    palette,
  );
  const urls = await Promise.all(
    wanted.map((b, i) => generateScene(list[i], "9:16", `${folder}/shot-${b.id}.jpg`).catch((e) => (console.error("[shot]", e), null))),
  );
  return Object.fromEntries(wanted.flatMap((b, i) => (urls[i] ? [[b.id, { url: urls[i], prompt: list[i] }]] : [])));
}

/**
 * A still brought to life: a 5-second AI video clip that starts from it (Kling image-to-video, in the
 * still's own vertical frame). Kept in storage like every other asset; null if it fails (the beat
 * then shows the still, and the credits are given back).
 */
export async function animateShot(image: string, prompt: string, path: string): Promise<string | null> {
  try {
    const res = await fetch("https://fal.run/fal-ai/kling-video/v2.5-turbo/pro/image-to-video", {
      method: "POST",
      headers: { Authorization: `Key ${process.env.FAL_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        image_url: image,
        prompt: `${prompt}. Subtle, natural motion in the scene and a slow cinematic camera move; realistic, no text.`,
        duration: "5",
        negative_prompt: "blur, distortion, morphing, warped hands, extra fingers, text, watermark, low quality",
      }),
    });
    if (!res.ok) throw new Error(`kling ${res.status}: ${await res.text()}`);
    const { video } = (await res.json()) as { video: { url: string } };
    const file = await fetch(video.url);
    if (!file.ok) throw new Error(`download ${file.status}`);
    const db = createAdminClient();
    const { error } = await db.storage.from("kit-assets").upload(path, Buffer.from(await file.arrayBuffer()), { contentType: "video/mp4", upsert: true });
    if (error) throw new Error(`storage: ${error.message}`);
    return db.storage.from("kit-assets").getPublicUrl(path).data.publicUrl;
  } catch (e) {
    console.error("[motion]", e);
    return null;
  }
}
