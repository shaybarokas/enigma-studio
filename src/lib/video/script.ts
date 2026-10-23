// The speech review: every narration line must have exactly one natural reading for the voice.
import { z } from "zod";
import { structured } from "../ai/claude";
import { ambiguousWords } from "./homographs";

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
export async function reviewForSpeech<T extends { voice: string; emphasis: string[] }>(scenes: T[]): Promise<T[]> {
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
