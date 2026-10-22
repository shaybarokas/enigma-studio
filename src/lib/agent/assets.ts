// The asset pipeline: AI scenes, cut-out lecturer and 3D props for a concept, stored in Supabase.
import sharp from "sharp";
import { createAdminClient } from "../supabase/admin";
import type { Concept } from "./concepts";

const BUCKET = "kit-assets";

type Image = { src: string; aspect: number };

// fal caps concurrent requests per account (10), so several kits generating at once get 429s.
// Those, and passing server errors, are waited out with backoff and jitter instead of failing the kit.
async function fal<T>(model: string, input: Record<string, unknown>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`https://fal.run/${model}`, {
      method: "POST",
      headers: { Authorization: `Key ${process.env.FAL_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (res.ok) return res.json() as Promise<T>;
    const body = await res.text();
    if ((res.status === 429 || res.status >= 500) && attempt < 8) {
      await new Promise((r) => setTimeout(r, Math.min(20_000, 1500 * 2 ** attempt) * (0.6 + Math.random() * 0.8)));
      continue;
    }
    throw new Error(`fal ${model}: ${res.status} ${body}`);
  }
}

async function download(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function store(path: string, data: Buffer, contentType: string): Promise<string> {
  const supabase = createAdminClient();
  const { error } = await supabase.storage.from(BUCKET).upload(path, data, { contentType, upsert: true });
  if (error) throw new Error(`storage: ${error.message}`);
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

/** A photographic scene. `aspect` is "16:9" or "9:16". Stored as a high-quality JPEG. */
export async function generateScene(prompt: string, aspect: "16:9" | "9:16", path: string): Promise<string> {
  const out = await fal<{ images: { url: string }[] }>("fal-ai/flux-pro/v1.1-ultra", {
    prompt,
    aspect_ratio: aspect,
    output_format: "jpeg",
  });
  const jpg = await sharp(await download(out.images[0].url)).jpeg({ quality: 90, mozjpeg: true }).toBuffer();
  return store(path, jpg, "image/jpeg");
}

/** Removes the background and trims to the subject. `kind` picks the matting model. */
export async function cutout(imageUrl: string, kind: "person" | "object", path: string): Promise<Image> {
  const out = await fal<{ image: { url: string } }>("fal-ai/birefnet/v2", {
    image_url: imageUrl,
    model: kind === "person" ? "Portrait" : "General Use (Heavy)",
    operating_resolution: "2048x2048",
    output_format: "png",
    refine_foreground: true,
  });
  const trimmed = await sharp(await download(out.image.url)).trim({ threshold: 10 }).png().toBuffer({ resolveWithObject: true });
  const src = await store(path, trimmed.data, "image/png");
  return { src, aspect: trimmed.info.width / trimmed.info.height };
}

/** One 3D object, rendered on white then cut out. */
export async function generateProp(prompt: string, path: string): Promise<Image> {
  const out = await fal<{ images: { url: string }[] }>("fal-ai/flux-pro/v1.1-ultra", {
    prompt,
    aspect_ratio: "1:1",
    output_format: "png",
  });
  return cutout(out.images[0].url, "object", path);
}

/** Uploads a user's own image (e.g. the lecturer photo) and returns a public URL. */
export async function storeUpload(path: string, data: Buffer, contentType: string): Promise<string> {
  return store(path, data, contentType);
}

/** Everything a concept needs, generated in parallel. */
export async function buildConceptAssets(concept: Concept, kitId: string, index: number, subject?: Image) {
  const base = `${kitId}/c${index}`;
  const [background, backgroundTall, ...props] = await Promise.all([
    generateScene(concept.backgroundPrompt, "16:9", `${base}/bg-16x9.jpg`),
    generateScene(concept.backgroundPrompt, "9:16", `${base}/bg-9x16.jpg`),
    ...concept.propPrompts.slice(0, 3).map((p, i) => generateProp(p, `${base}/prop-${i}.png`)),
  ]);
  return { background, backgroundTall, subject, props };
}
