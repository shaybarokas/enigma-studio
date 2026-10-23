// Footage from the course itself. A clip the user uploads is transcribed (what is said, word by word)
// and watched (frames the browser took from it), and the director marks the moments worth cutting
// into a video: strong pictures, and sentences of the lecturer strong enough to be heard as they are.
import { z } from "zod";
import { structured } from "../ai/claude";
import type { CourseClip } from "./storyboard-ui";

type Word = { text: string; start: number; end: number };

/** What is said in the clip, word by word (ElevenLabs reads the file straight from storage). */
async function transcribe(url: string): Promise<Word[]> {
  const form = new FormData();
  form.append("model_id", "scribe_v1");
  form.append("language_code", "he");
  form.append("cloud_storage_url", url);
  const res = await fetch("https://api.elevenlabs.io/v1/speech-to-text", { method: "POST", headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY! }, body: form });
  if (!res.ok) throw new Error(`transcribe ${res.status}: ${await res.text()}`);
  const d = (await res.json()) as { words?: { text: string; start: number; end: number; type: string }[] };
  return (d.words ?? []).filter((w) => w.type === "word").map(({ text, start, end }) => ({ text, start, end }));
}

// The transcript as timed lines, for the director to read.
function lines(words: Word[]) {
  const out: { start: number; end: number; text: string }[] = [];
  let cur: Word[] = [];
  const flush = () => {
    if (cur.length) out.push({ start: +cur[0].start.toFixed(2), end: +cur.at(-1)!.end.toFixed(2), text: cur.map((w) => w.text).join(" ") });
    cur = [];
  };
  for (const w of words) {
    if (cur.length && w.start - cur.at(-1)!.end > 0.7) flush();
    cur.push(w);
    if (/[.?!]$/.test(w.text) || cur.length >= 18) flush();
  }
  flush();
  return out;
}

const analysisSchema = z.object({
  summary: z.string().describe("Hebrew, one or two sentences: what the clip shows and who is in it"),
  highlights: z
    .array(
      z.object({
        start: z.number().describe("seconds"),
        end: z.number().describe("seconds"),
        label: z.string().describe("Hebrew, 2–6 words: what this moment is"),
        quote: z.boolean().describe("true when the moment is the lecturer saying a strong, self-contained sentence, to be heard with its own sound"),
      }),
    )
    .describe("3–8 moments, best first"),
});

/** Transcribes and watches a clip; returns it ready for the director. */
export async function analyzeClip(clip: CourseClip): Promise<CourseClip> {
  const words = await transcribe(clip.url).catch((e) => (console.error("[clip transcribe]", e), [] as Word[]));
  const out = await structured({
    schema: analysisSchema,
    effort: "medium",
    maxTokens: 4000,
    system: `You are the editor of course promos. You see frames from a clip of the course (each labelled with its time) and its transcript, and you mark the moments worth cutting into a promo or a marketing video:
- Picture moments (quote=false): 2–5 seconds of something that shows the course alive (hands at work, the lecturer explaining at the board, a result, students reacting). Choose times between the frames that show it.
- Quote moments (quote=true): 3–9 seconds where the lecturer says one strong, complete sentence that would make a viewer want the course. Start and end exactly on the transcript's word times, never mid-word or mid-sentence.
Never pick moments with blank screens, menus, cursor-only screen shares or someone off-guard.
A clip may be a whole recorded lesson (often a landscape screen of slides with the lecturer): then the transcript is your main guide. Read all of it and pick the lecturer's strongest sentences across the whole lesson, not only the opening, and picture moments only where a frame shows something worth seeing (a demonstration, a result, the lecturer on camera), not a slide of plain text.`,
    messages: [
      {
        role: "user",
        content: [
          ...clip.thumbs.flatMap((t) => [
            { type: "text" as const, text: `${t.t.toFixed(1)}s:` },
            { type: "image" as const, source: { type: "url" as const, url: t.url } },
          ]),
          { type: "text", text: JSON.stringify({ name: clip.name, seconds: clip.seconds, transcript: lines(words) }) },
        ],
      },
    ],
  });
  const highlights = out.highlights
    .map((h) => ({ ...h, start: Math.max(0, h.start), end: Math.min(clip.seconds, h.end) }))
    .filter((h) => h.end - h.start >= 1.2)
    .slice(0, 8);
  return { ...clip, words, summary: out.summary, highlights, status: "ready" };
}

/** What the director needs to know about the clips when writing a storyboard. */
export function clipsSummary(clips: CourseClip[]) {
  return clips
    .filter((c) => c.status === "ready")
    .map((c) => ({ clipId: c.id, name: c.name, seconds: Math.round(c.seconds), shows: c.summary, moments: c.highlights }));
}

/** The words spoken in a span of a clip, timed from the span's start. */
export function wordsIn(clip: CourseClip, start: number, end: number): Word[] {
  return (clip.words ?? []).filter((w) => w.start >= start - 0.05 && w.end <= end + 0.05).map((w) => ({ ...w, start: w.start - start, end: w.end - start }));
}
