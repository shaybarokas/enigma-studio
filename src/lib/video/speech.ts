// Getting Hebrew narration right. Unvowelled Hebrew is ambiguous (ספר: sefer/sapar/sfar), and
// foreign brand names have no fixed spelling, so before a line is spoken it can be prepared:
// vowel points only where a reader could go wrong, and names spelled the way they are said.
// The captions keep showing the original words.
import { z } from "zod";
import { structured } from "../ai/claude";

const NIQQUD = /[֑-ׇ]/g;
export const stripNiqqud = (s: string) => s.replace(NIQQUD, "");

const SYSTEM = `You prepare Hebrew narration lines for a Hebrew text-to-speech engine, so each line is read exactly as a native Israeli speaker says it in an ad.
For each line return the same words, in the same order, with:
- niqqud ONLY on words a reader could misread without vowels (homographs like ספר/ספר, ambiguous verb forms, uncommon words) and on every foreign or brand name written in Hebrew letters (e.g. מַיינְד קָאט); every other word stays bare;
- modern spoken Israeli pronunciation (e.g. כֹּל, צָהֳרַיִים), not Biblical;
- numbers and symbols already written as words; keep punctuation, which sets the pauses.
Never add, drop or reorder words.`;

export async function prepareSpeech(lines: string[]): Promise<string[]> {
  if (!lines.length) return lines;
  const out = await structured({
    schema: z.object({ lines: z.array(z.string()) }),
    system: SYSTEM,
    effort: "medium",
    messages: [{ role: "user", content: JSON.stringify({ lines }) }],
  });
  // Safety: if a line came back with different words, speak the original.
  return lines.map((orig, i) => {
    const prepared = out.lines[i];
    return prepared && stripNiqqud(prepared).replace(/\s+/g, " ").trim() === orig.replace(/\s+/g, " ").trim() ? prepared : orig;
  });
}
