// Three creative directions from a brief: each picks a template, builds a brand (palette + fonts),
// writes the copy and the prompts for the AI art that the asset pipeline will generate.
import { z } from "zod";
import { ICON_KEYS } from "@/engine/icon-keys";
import { CATALOG, COVER_TEMPLATE_IDS } from "@/engine/catalog";
import { FONT_NAMES } from "@/engine/fonts-list";
import { structured } from "../ai/claude";
import type { Brief } from "./brief";
import { mediaSummary } from "./interview";
import type { Media } from "./media";

const hex = z.string().describe("#rrggbb");
const font = z.enum(FONT_NAMES);

export const conceptSchema = z.object({
  name: z.string().describe("שם קצר לכיוון, בעברית"),
  idea: z.string().describe("משפט–שניים בעברית: מה הרעיון ולמה הוא יעבוד לקהל הזה"),
  templateId: z.enum(COVER_TEMPLATE_IDS as [string, ...string[]]),
  palette: z.object({ bg: hex, ink: hex, muted: hex, accent: hex }),
  displayFont: font,
  headlineFont: font,
  bodyFont: font,
  wordmark: z.array(z.string()).describe("1–3 lines of the brand name, usually 1–2 English words per line"),
  kicker: z.string(),
  headline: z.string().describe("Hebrew hook; '|' splits the ink part from the accent part"),
  subtitle: z.string(),
  bullets: z.array(z.string()).describe("3–5 concrete outcomes/topics, short"),
  icons: z.array(z.enum(ICON_KEYS)).describe("one icon per bullet, in the same order: the icon that best shows that outcome"),
  tags: z.array(z.string()).describe("0–2 short pills"),
  cta: z.string(),
  backgroundPrompt: z.string().describe("English prompt for the scene"),
  propPrompts: z.array(z.string()).describe("0–3 English prompts, one object each"),
  subjectSide: z.enum(["left", "right"]),
});
export type Concept = z.infer<typeof conceptSchema>;

const SYSTEM = `You are the creative director of Enigma Studio (by ENIGMA Digital). From a brief you create three distinct creative directions for a launch kit. Each must look like the work of a top Israeli design studio and be made for this exact business, never generic.

House style, learned from ENIGMA's best course covers:
- The person is the hero: a cut-out lecturer in an authority pose, big, relit to sit in the scene.
- The course gets its own brand: a short wordmark, usually 1–2 English words in a display face (BRICK BOSS, CODE TO CODE, SWING & WIN, CONVERSION LAB, LOAN LOGIC, THE BODY WHISPERER), or a huge Hebrew line when the hook is emotional ("אני יודע|שאתה משקר!", "איתותים שקטים").
- Objects from the field's world as 3D props (scissors for barbers, candlesticks and coins for trading, a bank and a percent sign for mortgages).
- A scene from the field's world behind (skyline at dusk for real estate, a code wall for developers), graded so the person and the type pop.
- Each course has its own palette; never default to purple.

The three directions must differ in template and feeling (e.g. one cinematic and premium, one bold-typographic, one bright and playful), and each must fit the brief's tone and audience. There are more cover templates than directions: choose the three that suit this business best, not the first three on the list.

Rules for each field:
- templateId: one of the cover templates below; use each template at most once across the three directions.
- palette: bg is the darkest/base tone (for studio-props and bold-repeat it is a saturated colour, e.g. #3f8f45 green, #2f6fd6 blue, #ff5a36 coral; for arch-luxe it may be a soft light tone such as #efe6da or a deep one); ink must read on bg (contrast ≥ 7:1); accent is the single highlight colour and must read on bg (≥ 3:1); muted is a softer ink.
- Fonts: displayFont for the Latin wordmark (Playfair Display = premium serif, Anton/Bebas Neue = bold condensed); headlineFont and bodyFont must support Hebrew (Heebo, Rubik, Secular One, Suez One, Frank Ruhl Libre).
- Copy is Hebrew (except an English wordmark), short, specific, in the audience's words. headline: the pain or a bold claim, ≤ 7 words, split with "|" before the part to colour. subtitle: the promise, ≤ 9 words. kicker: 2–4 words. bullets: 3–5 concrete outcomes, each ≤ 7 words. cta: 2–4 words.
- Never invent facts: no numbers, results, testimonials or credentials that are not in the brief.
- backgroundPrompt (English): a cinematic photographic scene from the field's world, NO people, NO text or logos, with calm negative space on the ${"text side"} (opposite subjectSide), lighting and colour matching the palette, "35mm, shallow depth, film grain". For studio-props and bold-repeat: a clean seamless studio backdrop in the bg colour. For arch-luxe: a soft, airy interior or detail from the field's world (it shows through an arched window behind the lecturer). For split-editorial: an atmospheric scene from the field's world (it fills one panel behind the lecturer).
- wordmark for bold-repeat: 1–3 short words that still read when repeated in huge rows; displayFont Anton or Bebas Neue.
- propPrompts (English, studio-props: 2–3, others: 0): each ONE object, "glossy 3D render, soft studio lighting, isolated on a plain pure white background, product render", no text.
- subjectSide: where the lecturer stands; text goes on the other side.

Cover templates:
${COVER_TEMPLATE_IDS.map((id) => `- ${id}: ${CATALOG[id].fits}`).join("\n")}

The user's own material comes first:
- brandColors (from their logo or their words) are the brand: build every palette from them (bg and accent from the brand colours, or one direction may use a neutral bg with the brand colour as accent). Never contradict an existing brand.
- If there is a logo, it appears on every piece by itself: do not draw another logo; the wordmark may repeat the brand name the logo shows, or name the course.
- Style references they uploaded show their taste: take mood, colour and typography cues from them, without copying.
- Product photos they uploaded become real props (cut out automatically); for studio-props, propPrompts add at most 1–2 objects around them.

Write "name" and "idea" in Hebrew. Never mention internal method names or frameworks.`;

export async function createConcepts(brief: Brief, media: Media[] = []): Promise<Concept[]> {
  // The creative director sees the logo and the style references themselves, not only their notes.
  const seen = media.filter((m) => m.role === "logo" || m.role === "reference").slice(-4);
  const out = await structured({
    schema: z.object({ concepts: z.array(conceptSchema) }),
    system: SYSTEM,
    effort: "high",
    messages: [
      {
        role: "user",
        content: [
          ...seen.map((m) => ({ type: "image" as const, source: { type: "url" as const, url: m.url } })),
          { type: "text" as const, text: `הבריף:\n${JSON.stringify(brief, null, 2)}\n\nהחומרים שהמשתמש העלה:\n${mediaSummary(media)}\n\nצור שלושה כיוונים.` },
        ],
      },
    ],
  });
  return out.concepts.slice(0, 3);
}
