// Edits by conversation: once a kit is designed, the user asks for changes in plain Hebrew and the
// agent turns them into a precise change to the design (copy, colours, fonts, layout, new scene).
import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { ELEMENT_NAMES, type DesignProps } from "@/engine/design";
import { FONT_NAMES } from "@/engine/fonts-list";
import { structured } from "../ai/claude";

const hex = z.string().describe("#rrggbb");
const editSchema = z.object({
  reply: z.string().describe("תשובה קצרה בעברית: מה שונה, או שאלה אם הבקשה לא ברורה"),
  copy: z
    .object({
      wordmark: z.array(z.string()).nullable(),
      kicker: z.string().nullable(),
      headline: z.string().nullable().describe("'|' splits ink from accent"),
      subtitle: z.string().nullable(),
      bullets: z.array(z.string()).nullable(),
      tags: z.array(z.string()).nullable(),
      cta: z.string().nullable(),
      price: z.string().nullable(),
    })
    .describe("only the fields to change; null = keep"),
  palette: z.object({ bg: hex.nullable(), ink: hex.nullable(), muted: hex.nullable(), accent: hex.nullable() }),
  displayFont: z.enum(FONT_NAMES).nullable(),
  headlineFont: z.enum(FONT_NAMES).nullable(),
  bodyFont: z.enum(FONT_NAMES).nullable(),
  subjectSide: z.enum(["left", "right"]).nullable(),
  scale: z
    .array(z.object({ el: z.enum(Object.keys(ELEMENT_NAMES) as [string, ...string[]]), scale: z.number() }))
    .describe("element size multipliers for every output, e.g. headline 1.2 = 20% bigger"),
  newBackgroundPrompt: z.string().nullable().describe("English prompt for a new scene, only if the user asked for a different background"),
});
export type DesignEdit = z.infer<typeof editSchema>;

const SYSTEM = `You are the creative director of Enigma Studio. The user's launch kit is designed; now they ask for changes in Hebrew. Turn each request into the smallest precise change to the design and confirm it in one short, warm Hebrew sentence.

Rules:
- Change only what was asked. Fields you don't change are null (or an empty array for scale).
- Copy stays short and in the audience's language; never invent facts, numbers or testimonials.
- Colours must keep contrast: ink on bg ≥ 7:1, accent on bg ≥ 3:1. "More premium" usually means deeper bg, gold or champagne accent, a serif wordmark (Playfair Display), calmer copy. "More energetic" means saturated colours, condensed display (Anton/Bebas Neue), punchier copy.
- Hebrew fonts for headline/body: Heebo, Rubik, Secular One, Suez One, Frank Ruhl Libre.
- Sizes: "bigger" ≈ 1.15–1.3, "much bigger" ≈ 1.5, "smaller" ≈ 0.8. Elements: ${Object.entries(ELEMENT_NAMES)
  .map(([k, v]) => `${k} (${v})`)
  .join(", ")}.
- A different background → newBackgroundPrompt: cinematic photographic scene, no people, no text, matching the palette, calm space for text.
- If the request is unclear, change nothing and ask one short question in reply.
- Never mention internal method names or frameworks.`;

export async function planEdit(history: Anthropic.Beta.BetaMessageParam[], design: DesignProps): Promise<DesignEdit> {
  const current = { brand: design.brand, copy: design.copy, subjectSide: design.subjectSide };
  return structured({
    schema: editSchema,
    system: SYSTEM,
    effort: "medium",
    messages: [...history, { role: "user", content: `[העיצוב הנוכחי]\n${JSON.stringify(current)}` }],
  });
}

/** Applies an edit; scale changes multiply the element's size in every output. */
export function applyEdit(d: DesignProps, e: DesignEdit, background?: { wide: string; tall: string }): DesignProps {
  const copy = { ...d.copy };
  for (const [k, v] of Object.entries(e.copy)) if (v !== null) (copy as Record<string, unknown>)[k] = v;
  const palette = { ...d.brand.palette };
  for (const [k, v] of Object.entries(e.palette)) if (v) (palette as Record<string, string>)[k] = v;
  const overrides = { ...d.overrides };
  for (const { el, scale } of e.scale) {
    const s = Math.min(2.5, Math.max(0.3, (overrides[el]?.scale ?? 1) * scale));
    overrides[el] = { ...overrides[el], scale: s };
  }
  return {
    ...d,
    copy,
    brand: {
      palette,
      displayFont: e.displayFont ?? d.brand.displayFont,
      headlineFont: e.headlineFont ?? d.brand.headlineFont,
      bodyFont: e.bodyFont ?? d.brand.bodyFont,
    },
    subjectSide: e.subjectSide ?? d.subjectSide,
    overrides,
    assets: background ? { ...d.assets, background: background.wide, backgroundTall: background.tall } : d.assets,
  };
}
