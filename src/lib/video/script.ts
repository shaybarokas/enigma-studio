// The video script: the scenes in order and the Hebrew narration line for each, written to be
// heard (short, rhythmic, spoken Hebrew), with the words to paint in the accent colour.
import { z } from "zod";
import type { DesignProps } from "@/engine/design";
import { SCENE_TYPES } from "@/engine/video/schema";
import { structured } from "../ai/claude";
import { ambiguousWords } from "./homographs";
import type { Brief } from "../agent/brief";

const scriptSchema = z.object({
  scenes: z.array(
    z.object({
      type: z.enum(SCENE_TYPES),
      voice: z.string().describe("narration line in Hebrew, spoken, 4–14 words"),
      emphasis: z.array(z.string()).describe("1–2 words from the line to colour"),
    }),
  ),
  musicPrompt: z.string().describe("English prompt for an instrumental music bed matching tone and pace"),
});
export type VideoScript = z.infer<typeof scriptSchema>;

const SHAPES = {
  promo: `A promo is a movie trailer for the course: what it's about and who teaches it, so the viewer gets it in 20 seconds.
House style (from ENIGMA's own promos): open with a line that reframes the field ("עיצוב שיער הוא לא רק דירוג או גוונים, זו אומנות ומדע שלם."), then the human truth behind it, then the reveal "מרכז ההכשרות של אניגמה מציג:" (only when enigmaCourse is true; otherwise present it in the business's own name) followed by the course name and lecturer, then what you'll master, and close with where it's available.
Scenes, in this order: cover (name reveal) → hero (the lecturer, their authority) → bullets (what you'll be able to do) → cta (name the course and the action).
Optionally a props scene after hero when the brand has objects from its field.`,
  marketing: `A marketing video sells: hook in the first 2 seconds, touch the pain, present the course as the solution, show what they get, call to action.
Scenes, in this order: hook (the pain or a bold question, spoken like a person, not an ad) → hero (empathy + who will get them out of it) → cover (the solution, the course's name) → bullets (what they get) → cta (one clear action, price if known).`,
};

const SYSTEM = `You write short Hebrew video scripts for Enigma Studio (ENIGMA Digital). Each video is 9:16, 18–28 seconds, narrated by a Hebrew voice with big kinetic captions.

How the narration must sound:
- Spoken Israeli Hebrew, natural rhythm, short sentences. No marketing clichés ("הזדמנות של פעם בחיים", "אל תפספסו"), no exclamation spam.
- Each scene type appears at most once (one bullets scene says all the outcomes it needs).
- 4–14 words per scene; the whole video 45–70 words. The cta scene names the course and the action ("לחצו על הקישור ו…", "ההרשמה פתוחה עכשיו").
- The voice reads unvowelled Hebrew, so avoid words it can misread out of context (ספר, מספר, חלק, שמע…): give them context ("ספר עם מספרה משלו"), or choose a clearer word ("בעל מספרה").
- Write numbers as words and avoid abbreviations so the voice reads them right ("אלף מאה תשעים ותשעה שקלים", not "₪1199"; "נדל״ן" is fine).
- Never invent facts, results, testimonials or credentials that are not in the brief.
- emphasis: one or two of the line's own words, exactly as written in it, that carry the meaning.
- musicPrompt: instrumental only, genre, mood and tempo that fit the tone (e.g. "cinematic dark hybrid trailer, slow build, deep pulses, 90 bpm, instrumental").
Never mention internal method names or frameworks.`;

const reviewSchema = z.object({
  lines: z.array(z.object({ voice: z.string(), emphasis: z.array(z.string()), changed: z.boolean() })),
});

const REVIEW = `You are a Hebrew speech editor. Each line will be read aloud by a text-to-speech engine that sees Hebrew WITHOUT vowels and does not reliably obey niqqud. Your job: make sure every line can only be read one way, and sounds like natural spoken Israeli Hebrew.

For each line:
- Find any word whose unvowelled spelling has more than one common reading (e.g. ספר: sefer/sapar/sipper; מספר: mispar/mesaper; חלק, שמע, בקר, עבר, דבר, כתב, ספרים, מלא/מילא…) or a form people stumble on (rare inflections, long construct chains, archaic or literary words, ambiguous verb forms).
- If there is one, rewrite the line with everyday words that can only be read one way (ספר → מעצב שיער / בעל מספרה; מספר → כמה / סיפר), keeping the meaning, tone and length. Otherwise return the line unchanged.
- Never add facts. Keep numbers as words.
- emphasis: 1–2 words that appear exactly in the final line.
- changed: true if you rewrote it.`;

/**
 * A second pass over the narration: every line must have exactly one natural reading. A fixed list
 * of ambiguous words is checked after the review; any line still using one is sent back with the
 * words named, until none is left.
 */
async function reviewForSpeech(scenes: VideoScript["scenes"]): Promise<VideoScript["scenes"]> {
  let current = scenes;
  for (let round = 0; round < 3; round++) {
    const flagged = current.map((s) => ambiguousWords(s.voice));
    if (round > 0 && flagged.every((f) => f.length === 0)) return current;
    const out = await structured({
      schema: reviewSchema,
      system: REVIEW,
      effort: "high",
      messages: [
        {
          role: "user",
          content: JSON.stringify({
            lines: current.map((s, i) => ({ voice: s.voice, emphasis: s.emphasis, mustReplace: flagged[i] })),
            note: "mustReplace: words the voice will misread. The rewritten line must not contain them in any form.",
          }),
        },
      ],
    });
    current = current.map((s, i) => {
      const r = out.lines[i];
      if (!r?.voice.trim()) return s;
      return { ...s, voice: r.voice, emphasis: r.emphasis.filter((w) => r.voice.includes(w)) };
    });
  }
  const left = current.flatMap((s) => ambiguousWords(s.voice));
  if (left.length) console.warn("[script] ambiguous words left:", left.join(", "));
  return current;
}

export async function writeVideoScript(kind: "promo" | "marketing", brief: Brief | null, design: DesignProps): Promise<VideoScript> {
  const context = {
    brief,
    brandName: design.copy.wordmark.join(" "),
    promise: design.copy.subtitle,
    hook: design.copy.headline.replace("|", " "),
    outcomes: design.copy.bullets,
    cta: design.copy.cta,
    price: design.copy.price ?? null,
    hasProps: design.assets.props.length > 0,
    enigmaCourse: /enigmacourse\.com/.test(brief?.link ?? ""),
  };
  const script = await structured({
    schema: scriptSchema,
    system: SYSTEM,
    effort: "medium",
    messages: [{ role: "user", content: `${SHAPES[kind]}\n\nהחומר:\n${JSON.stringify(context, null, 2)}` }],
  });
  return { ...script, scenes: await reviewForSpeech(script.scenes) };
}
