// The images a user gives the agent: each one is looked at (Claude vision), sorted into what it is
// (the lecturer, a logo, a product, a style reference) and prepared for that job: the lecturer and
// products are cut out, a logo is freed from its background, colours become the brand palette.
import sharp from "sharp";
import { z } from "zod";
import { structured } from "../ai/claude";
import { cutout, storeUpload } from "./assets";

export const MEDIA_ROLES = ["lecturer", "logo", "product", "reference", "other"] as const;
export type MediaRole = (typeof MEDIA_ROLES)[number];
export { ROLE_NAMES } from "./media-names";

type Image = { src: string; aspect: number };
export type Media = {
  id: string;
  url: string; // the original, as uploaded (normalised)
  role: MediaRole;
  note: string; // what the agent saw, in Hebrew
  palette: string[]; // dominant colours, #rrggbb
  text?: string | null; // words written in a logo
  cut?: Image; // the prepared asset: cut-out lecturer/product, logo without its background
  tone?: "light" | "dark"; // a logo's own brightness, so it is never set on a ground of the same tone
  primary?: boolean; // the one chosen (in the chat or the materials card) when there are several of a role
};

const analysisSchema = z.object({
  role: z.enum(MEDIA_ROLES).describe("lecturer = a photo of the person who teaches/sells; logo = a brand mark; product = an object being sold; reference = a design, ad or style the user likes; other"),
  note: z.string().describe("Hebrew, one short sentence: what is in the image and what matters for design"),
  palette: z.array(z.string()).describe("2–5 dominant brand/design colours as #rrggbb, most important first. For a logo: the colours of the mark itself, never the plain background it sits on. For a lecturer photo: clothing colours only if striking, else []"),
  text: z.string().nullable().describe("text written in a logo or design, exactly as written; null if none"),
});

/** What the image is and its colours, from Claude looking at it (with the user's words as a hint). */
export async function analyzeImage(url: string, hint: string): Promise<z.infer<typeof analysisSchema>> {
  return structured({
    schema: analysisSchema,
    effort: "low",
    maxTokens: 2000,
    system: "You sort images a business owner uploads to a design studio. Decide what each image is, describe it in one short Hebrew sentence, extract its key colours as hex, and read any text in a logo exactly.",
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "url", url } },
          { type: "text", text: hint ? `מה שהמשתמש כתב לצד התמונה: "${hint}"` : "אין טקסט מצורף." },
        ],
      },
    ],
  });
}

/** Normalises an upload: rotated, at most 2400px, PNG when it has transparency (logos), else JPEG. */
export async function storeOriginal(data: Buffer, folder: string, id: string) {
  const input = sharp(data).rotate();
  const meta = await input.metadata();
  const resized = input.resize(2400, 2400, { fit: "inside", withoutEnlargement: true });
  if (meta.hasAlpha) return storeUpload(`${folder}/media-${id}.png`, await resized.png().toBuffer(), "image/png");
  return storeUpload(`${folder}/media-${id}.jpg`, await resized.jpeg({ quality: 92 }).toBuffer(), "image/jpeg");
}

async function download(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

/**
 * A logo without its background. Transparent files are kept (trimmed); a logo on a plain colour has
 * that colour keyed out precisely (an AI matte can eat thin strokes); a logo inside a photo is cut out.
 */
async function prepareLogo(url: string, path: string): Promise<{ cut: Image; tone: "light" | "dark" }> {
  const buf = await download(url);
  const img = sharp(buf).ensureAlpha();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const px = (x: number, y: number) => {
    const i = (y * w + x) * 4;
    return [data[i], data[i + 1], data[i + 2], data[i + 3]];
  };
  const corners = [px(0, 0), px(w - 1, 0), px(0, h - 1), px(w - 1, h - 1)];
  const transparent = corners.every((c) => c[3] < 16);
  const spread = Math.max(...[0, 1, 2].map((k) => Math.max(...corners.map((c) => c[k])) - Math.min(...corners.map((c) => c[k]))));

  let out: Buffer;
  if (transparent) {
    out = await sharp(buf).trim({ threshold: 1 }).png().toBuffer();
  } else if (spread < 24) {
    // Plain ground: every pixel close to it becomes transparent, with a soft edge for anti-aliasing.
    const bg = [0, 1, 2].map((k) => Math.round(corners.reduce((a, c) => a + c[k], 0) / 4));
    for (let i = 0; i < data.length; i += 4) {
      const d = Math.max(Math.abs(data[i] - bg[0]), Math.abs(data[i + 1] - bg[1]), Math.abs(data[i + 2] - bg[2]));
      if (d < 18) data[i + 3] = 0;
      else if (d < 48) data[i + 3] = Math.round((data[i + 3] * (d - 18)) / 30);
    }
    out = await sharp(data, { raw: { width: w, height: h, channels: 4 } }).trim({ threshold: 1 }).png().toBuffer();
  } else {
    const c = await cutout(url, "object", path);
    out = await download(c.src);
  }

  // The logo's own brightness (opaque pixels only), so templates can give it a contrasting plate.
  const { data: d2, info: i2 } = await sharp(out).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let sum = 0;
  let n = 0;
  for (let i = 0; i < d2.length; i += 16) {
    if (d2[i + 3] > 128) {
      sum += 0.2126 * d2[i] + 0.7152 * d2[i + 1] + 0.0722 * d2[i + 2];
      n++;
    }
  }
  const src = await storeUpload(path, out, "image/png");
  return { cut: { src, aspect: i2.width / i2.height }, tone: n && sum / n > 150 ? "light" : "dark" };
}

/** Prepares an image for its role (cut-outs for the lecturer and products, a clean logo). */
export async function prepareMedia(m: Media, folder: string): Promise<Media> {
  const path = `${folder}/media-${m.id}-${m.role}.png`;
  if (m.role === "lecturer") return { ...m, cut: await cutout(m.url, "person", path), tone: undefined };
  if (m.role === "product") return { ...m, cut: await cutout(m.url, "object", path), tone: undefined };
  if (m.role === "logo") return { ...m, ...(await prepareLogo(m.url, path)) };
  return { ...m, cut: undefined, tone: undefined };
}

/** The brand colours the media tells us: a logo's first, then references'. */
export function brandColors(media: Media[]) {
  const ordered = [...media.filter((m) => m.role === "logo"), ...media.filter((m) => m.role === "reference")];
  return [...new Set(ordered.flatMap((m) => m.palette.map((c) => c.toLowerCase())))].slice(0, 6);
}
