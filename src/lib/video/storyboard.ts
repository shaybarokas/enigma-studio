// The storyboard: the video as the user approves it before anything is produced. A sequence of
// beats, each one narration line with its on-screen title and what is seen. The agent writes it,
// the user edits every word (or asks the agent for changes), and production follows it exactly.
import { z } from "zod";
import type { DesignProps } from "@/engine/design";
import { structured } from "../ai/claude";
import type { Brief } from "../agent/brief";
import { mediaSummary } from "../agent/interview";
import type { Media } from "../agent/media";
import { ambiguousWords } from "./homographs";
import { reviewForSpeech } from "./script";

/** The video row as the studio reads it. */
export const VIDEO_FIELDS = "id, kind, voice, status, url, error, created_at, storyboard";

export { BEAT_ROLES, ROLE_LABELS, VISUALS, VISUAL_LABELS, CAPTION_STYLES, CAPTION_LABELS } from "./storyboard-ui";
import { BEAT_PADDING, BEAT_ROLES, CAPTION_STYLES, LENGTH, VISUALS, WORDS_PER_SECOND, estimateSeconds } from "./storyboard-ui";

const beatSchema = z.object({
  id: z.string(),
  role: z.enum(BEAT_ROLES),
  voice: z.string().describe("the narration line, Hebrew"),
  title: z.string().describe("big on-screen text, ≤ 5 words, Hebrew (or the English brand name)"),
  sub: z.string().describe("optional smaller line under it, ≤ 8 words; '' if none"),
  items: z.array(z.string()).describe("for visual=list: 3–5 short items (≤ 5 words each); else []"),
  visual: z.enum(VISUALS),
  shot: z.string().describe("for visual=scene: what the camera sees in this moment, one short Hebrew sentence (a concrete image from the field's world, no text in it); else ''"),
  emphasis: z.array(z.string()).describe("1–2 words of the voice line to colour in captions"),
});
export type Beat = z.infer<typeof beatSchema>;

export const storyboardSchema = z.object({
  kind: z.enum(["promo", "marketing"]),
  voice: z.string(), // narrator key
  music: z.string().describe("English prompt for the instrumental music"),
  musicMood: z.string().describe("the music's mood in 2–4 Hebrew words, for the user"),
  captions: z.enum(CAPTION_STYLES),
  beats: z.array(beatSchema),
});
export type Storyboard = z.infer<typeof storyboardSchema>;

export { LENGTH, beatSeconds, estimateSeconds } from "./storyboard-ui";

/** Words in the narration the voice may misread, per beat. */
export const speechIssues = (sb: Pick<Storyboard, "beats">) =>
  sb.beats.map((b) => ({ id: b.id, words: ambiguousWords(b.voice) })).filter((x) => x.words.length);

// Spoken words that fill a length, after each beat's breath (see beatSeconds).
const words = (seconds: number, beats: number) => Math.round((seconds - beats * BEAT_PADDING) * WORDS_PER_SECOND);

const SHAPES = {
  promo: `A PROMO is a movie trailer for the course, ${LENGTH.promo[0]}–${LENGTH.promo[1]} seconds: 8–10 beats and ${words(LENGTH.promo[0] + 2, 9)}–${words(LENGTH.promo[1] - 2, 9)} spoken words IN TOTAL (count them; most beats 5–8 words).
Arc: a line that reframes the field (hook) → the human truth behind it → the reveal ("מרכז ההכשרות של אניגמה מציג:" only when enigmaCourse is true, else in the business's own name) and the course name (intro) → who teaches and why them (lecturer, proof) → a glimpse of what happens inside (glimpse) → what you'll master (outcomes, a list) → the offer (offer, only if price/offer is known) → close with the name and where to join (cta).`,
  marketing: `A MARKETING video sells, ${LENGTH.marketing[0]}–${LENGTH.marketing[1]} seconds: 9–12 beats and ${words(LENGTH.marketing[0] + 3, 11)}–${words(LENGTH.marketing[1] - 4, 11)} spoken words IN TOTAL (count them; most beats 5–9 words), in the rhythm of a strong reel.
Arc: hook in the first two seconds (the pain or a bold question, spoken like a person, not an ad) → twist the pain (pain) → the turn: there is a way (solution) → the course and its name (intro) → who will take them there (lecturer, proof) → what they get (outcomes, a list) → a glimpse inside (glimpse) → the offer (offer, if known) → one clear action (cta).`,
};

const SYSTEM = `You are the video director and copywriter of Enigma Studio (ENIGMA Digital): you write Hebrew video storyboards for 9:16 promos and marketing videos, cut fast to music, narrated by an Israeli voice, with big kinetic titles. The user will read and approve every word before anything is produced.

Each beat is one narration line (voice) with what the viewer sees:
- voice: spoken Israeli Hebrew, natural rhythm, 4–12 words (short lines cut better). No marketing clichés ("הזדמנות של פעם בחיים", "אל תפספסו"), no exclamation spam.
- title: the big on-screen words for that moment, ≤ 5 words, punchy, NOT a copy of the narration (it adds or distils). sub: optional, ≤ 8 words.
- visual: what fills the frame. lecturer = the lecturer's photo (only if there is one); scene = the cinematic world of the field; cover = the kit's display graphic; props = the field's objects (only if the design has props); list = items on screen (outcomes); logo = the brand's logo (only if there is one). Vary visuals so no two neighbouring beats look the same.
- shot: only for visual=scene, a concrete cinematic image for that exact moment (e.g. "ידיים מקפלות בצק על משטח עץ, אור חלון רך"), different in every scene beat. Each one is generated as its own still, so the video doesn't repeat one picture.
- items: only for visual=list, 3–5 outcomes, ≤ 5 words each.
- emphasis: 1–2 words of the voice line, exactly as written there.

Rules for the narration:
- The voice reads unvowelled Hebrew: avoid words it can misread out of context (ספר, מספר, חלק, שמע, בקר, עבר, דבר…); choose words with one reading.
- Numbers and prices as words ("תשע מאות תשעים שקלים"), no abbreviations or symbols in voice. On screen (title/sub) numbers stay as digits ("990 ₪").
- Never invent facts, results, testimonials or credentials that are not in the material.
- music: English prompt for instrumental music fitting the tone, with tempo (e.g. "cinematic dark hybrid trailer, pulses and hits, 100 bpm, instrumental"); musicMood: the same in 2–4 Hebrew words.
- captions: "bold" unless the tone calls for "box" (busy visuals) or "minimal" (calm, premium).
Never mention internal method names or frameworks.`;

const draftSchema = storyboardSchema.omit({ kind: true, voice: true }).extend({ beats: z.array(beatSchema.omit({ id: true })) });

const withIds = (beats: Omit<Beat, "id">[]): Beat[] => beats.map((b, i) => ({ ...b, id: `b${Date.now().toString(36)}${i}` }));

function material(brief: Brief | null, design: DesignProps, media: Media[]) {
  return {
    brief,
    brandName: design.copy.wordmark.join(" "),
    promise: design.copy.subtitle,
    hook: design.copy.headline.replace("|", " "),
    outcomes: design.copy.bullets,
    cta: design.copy.cta,
    price: design.copy.price ?? brief?.price ?? null,
    hasLecturerPhoto: Boolean(design.assets.subject),
    hasProps: design.assets.props.length > 0,
    hasLogo: Boolean(design.assets.logo),
    enigmaCourse: /enigmacourse\.com/.test(brief?.link ?? ""),
    media: mediaSummary(media),
  };
}

/** The agent's first storyboard for a kit, held to the kind's length. */
export async function writeStoryboard(kind: Storyboard["kind"], voice: string, brief: Brief | null, design: DesignProps, media: Media[]): Promise<Storyboard> {
  const draft = await structured({
    schema: draftSchema,
    system: SYSTEM,
    effort: "high",
    messages: [{ role: "user", content: `${SHAPES[kind]}\n\nהחומר:\n${JSON.stringify(material(brief, design, media), null, 2)}` }],
  });
  // The voice's misreadings are fixed before the user sees the draft.
  const sb: Storyboard = { kind, voice, ...draft, beats: withIds(await reviewForSpeech(draft.beats)) };
  return fitLength(sb, brief, design, media);
}

/** A draft that runs outside its kind's range gets one tightening (or filling) pass. */
async function fitLength(sb: Storyboard, brief: Brief | null, design: DesignProps, media: Media[]) {
  const [min, max] = LENGTH[sb.kind];
  const seconds = estimateSeconds(sb);
  if (seconds >= min && seconds <= max) return sb;
  const target = Math.round((min + max) / 2);
  const total = sb.beats.reduce((a, b) => a + b.voice.trim().split(/\s+/).length, 0);
  const goal = words(target, sb.beats.length);
  const instruction =
    seconds > max
      ? `The narration runs about ${seconds} seconds (${total} words); it must be about ${target} seconds: cut to about ${goal} words in total. Tighten every line, merge or drop the weakest beat if needed; keep the hook, the name and the cta.`
      : `The narration runs only about ${seconds} seconds (${total} words); it must be about ${target} seconds: grow to about ${goal} words in total with substance from the material, not filler.`;
  const fitted = await reviseStoryboard(sb, instruction, brief, design, media);
  // Whichever is closer to the range wins (a revision can overshoot the other way).
  const off = (x: Storyboard) => Math.max(0, min - estimateSeconds(x), estimateSeconds(x) - max);
  return off(fitted) < off(sb) ? fitted : sb;
}

/** The storyboard rewritten by the agent at the user's request ("make the hook sharper"). Beats the
 * request doesn't touch stay word for word. */
export async function reviseStoryboard(sb: Storyboard, instruction: string, brief: Brief | null, design: DesignProps, media: Media[]): Promise<Storyboard> {
  const draft = await structured({
    schema: draftSchema,
    system: `${SYSTEM}\n\nYou are revising an existing storyboard the user is editing. Apply their request precisely; keep every beat the request does not touch exactly as it is (same words). Keep the length within the kind's range.`,
    effort: "high",
    messages: [
      {
        role: "user",
        content: `${SHAPES[sb.kind]}\n\nהחומר:\n${JSON.stringify(material(brief, design, media))}\n\nהתסריט הנוכחי:\n${JSON.stringify({ music: sb.music, musicMood: sb.musicMood, captions: sb.captions, beats: sb.beats.map((b) => ({ role: b.role, voice: b.voice, title: b.title, sub: b.sub, items: b.items, visual: b.visual, shot: b.shot, emphasis: b.emphasis })) }, null, 2)}\n\nהבקשה של המשתמש: ${instruction}`,
      },
    ],
  });
  // Unchanged beats keep their ids (and so their place in the editor).
  const beats = (await reviewForSpeech(draft.beats)).map((b, i) => {
    const same = sb.beats.find((o) => o.voice === b.voice && o.title === b.title);
    return { ...b, id: same?.id ?? `b${Date.now().toString(36)}${i}` };
  });
  return { ...sb, ...draft, beats };
}

/** A storyboard sent back by the editor, checked and trimmed. */
export function cleanStoryboard(input: unknown, base: Storyboard): Storyboard | null {
  // Drafts written before shots existed have none.
  const raw = input as { beats?: Record<string, unknown>[] } | null;
  if (raw?.beats) raw.beats = raw.beats.map((b) => ({ shot: "", ...b }));
  const parsed = storyboardSchema.safeParse(raw);
  if (!parsed.success) return null;
  const sb = parsed.data;
  const beats = sb.beats
    .map((b) => ({ ...b, shot: b.shot.trim().slice(0, 200), voice: b.voice.trim().slice(0, 300), title: b.title.trim().slice(0, 60), sub: b.sub.trim().slice(0, 90), items: b.items.map((x) => x.trim().slice(0, 50)).filter(Boolean).slice(0, 6) }))
    .filter((b) => b.voice)
    .slice(0, 16);
  return beats.length ? { ...sb, kind: base.kind, beats } : null;
}
