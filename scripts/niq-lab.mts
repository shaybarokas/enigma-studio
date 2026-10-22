import { z } from "zod";
import { structured } from "../src/lib/ai/claude";
const text = process.argv[2];
const out = await structured({
  schema: z.object({ partial: z.string(), full: z.string() }),
  system: "You prepare Hebrew text for a Hebrew text-to-speech engine so it is read exactly like a native Israeli speaker would say it. Return two versions of the same text, same words: partial = add niqqud ONLY to words whose reading is ambiguous or commonly misread without vowels (and to foreign/brand names written in Hebrew), leave all other words bare; full = complete, correct modern Israeli niqqud on every word (spoken pronunciation, e.g. כֹּל not כָּל where relevant). Keep punctuation.",
  messages: [{ role: "user", content: text }],
  effort: "high",
});
console.log(JSON.stringify(out));
