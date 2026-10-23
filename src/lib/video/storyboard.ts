// The storyboard: the video as the user approves it before anything is produced. A sequence of
// beats, each one narration line with its on-screen title and what is seen. The agent writes it,
// the user edits every word (or asks the agent for changes), and production follows it exactly.
import { z } from "zod";
import type { DesignProps } from "@/engine/design";
import { structured } from "../ai/claude";
import type { Brief } from "../agent/brief";
import { mediaSummary } from "../agent/interview";
import type { Media } from "../agent/media";
import { clipsSummary } from "./clips";
import { ambiguousWords } from "./homographs";
import { reviewForSpeech } from "./script";

/** The video row as the studio reads it. */
export const VIDEO_FIELDS = "id, kind, voice, status, url, error, created_at, storyboard";

export { BEAT_ROLES, ROLE_LABELS, VISUALS, VISUAL_LABELS, CAPTION_STYLES, CAPTION_LABELS } from "./storyboard-ui";
import { type CourseClip, BEAT_PADDING, BEAT_ROLES, CAPTION_STYLES, LENGTH, VISUALS, WORDS_PER_SECOND, estimateSeconds } from "./storyboard-ui";

const beatSchema = z.object({
  id: z.string(),
  role: z.enum(BEAT_ROLES),
  voice: z.string().describe("the narration line, Hebrew"),
  title: z.string().describe("big on-screen text, ≤ 5 words, Hebrew (or the English brand name)"),
  sub: z.string().describe("optional smaller line under it, ≤ 8 words; '' if none"),
  items: z.array(z.string()).describe("for visual=list: 3–5 short items (≤ 5 words each); else []"),
  visual: z.enum(VISUALS),
  clipId: z.string().describe("for visual=clip: the clipId of the course clip; else ''"),
  clipStart: z.number().describe("for visual=clip: where the cut starts in the clip, seconds; else 0"),
  clipEnd: z.number().describe("for visual=clip: where it ends, seconds; else 0"),
  clipAudio: z.boolean().describe("for visual=clip: true when the lecturer's own words in the clip are heard (a quote moment), and voice is ''; else false"),
  shot: z.string().describe("one short Hebrew sentence: a concrete image from the field's world, no text in it. For visual=scene it is the picture; for lecturer/cover/props it is the cut-away the camera goes to mid-beat. '' for list, logo, clip and the cta"),
  emphasis: z.array(z.string()).describe("1–2 words of the voice line to colour in captions"),
});
// Set by the user only (it costs credits): a scene beat brought to life as an AI video clip.
const beatExtra = z.object({ motion: z.boolean().default(false) });
export type Beat = z.infer<typeof beatSchema> & z.infer<typeof beatExtra>;

export const storyboardSchema = z.object({
  kind: z.enum(["promo", "marketing"]),
  voice: z.string(), // narrator key
  music: z.string().describe("English prompt for the instrumental music"),
  musicMood: z.string().describe("the music's mood in 2–4 Hebrew words, for the user"),
  captions: z.enum(CAPTION_STYLES),
  beats: z.array(beatSchema.merge(beatExtra)),
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
- visual: what fills the frame. lecturer = the lecturer's photo (only if there is one); scene = the cinematic world of the field; cover = the kit's display graphic (at most ONCE in the video, usually the reveal or the offer); props = the field's objects (only if the design has props); list = items on screen (outcomes); logo = the brand's logo (only if there is one). Vary visuals so no two neighbouring beats look the same.
- shot: a concrete cinematic image for that exact moment (e.g. "ידיים מקפלות בצק על משטח עץ, אור חלון רך"), different in every beat. For scene beats it is the picture; for lecturer, cover and props beats it is the cut-away the editor cuts to mid-beat (so the video keeps changing pictures). Each is generated as its own still. Write one for every beat except list, logo, clip and the cta.
- items: only for visual=list, 3–5 outcomes, ≤ 5 words each.
- visual=clip: a moment of real footage from the course (only from "clips" in the material, with its clipId and a moment's exact start/end). Real footage is the strongest proof: when clips exist, use 1–3 of them (glimpse, lecturer, proof). A moment marked quote=true can be a beat of its own: clipAudio=true and voice '' (the lecturer is heard saying it; the title distils it). Otherwise the narration runs over the clip (clipAudio=false) and the clip's span should be at least as long as the line.
- emphasis: 1–2 words of the voice line, exactly as written there.

Rules for the narration:
- The voice reads unvowelled Hebrew: avoid words it can misread out of context (ספר, מספר, חלק, שמע, בקר, עבר, דבר…); choose words with one reading.
- Numbers and prices as words ("תשע מאות תשעים שקלים"), no abbreviations or symbols in voice. On screen (title/sub) numbers stay as digits ("990 ₪").
- Never invent facts, results, testimonials or credentials that are not in the material.
- music: English prompt for instrumental music fitting the tone, with tempo (e.g. "cinematic dark hybrid trailer, pulses and hits, 100 bpm, instrumental"); musicMood: the same in 2–4 Hebrew words.
- captions: "bold" (the default: read at a glance on a phone, without sound), or "box" over busy pictures. Never "minimal" unless the user asks for it.
Never mention internal method names or frameworks.`;

const draftSchema = storyboardSchema.omit({ kind: true, voice: true }).extend({ beats: z.array(beatSchema.omit({ id: true })) });

const withIds = (beats: Omit<Beat, "id" | "motion">[]): Beat[] => beats.map((b, i) => ({ ...b, motion: false, id: `b${Date.now().toString(36)}${i}` }));

/** What the director writes from: the brief, the design, the user's images and the course clips. */
export type Material = { brief: Brief | null; design: DesignProps; media: Media[]; clips: CourseClip[] };

function material({ brief, design, media, clips }: Material) {
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
    clips: clipsSummary(clips),
  };
}

/**
 * Clip beats checked against the clips that exist: an unknown clip becomes a scene, a span is kept
 * inside its clip, and a clip that speaks for itself needs no narration (others do).
 */
export function checkClips<T extends Omit<Beat, "id" | "motion">>(beats: T[], clips: CourseClip[]): T[] {
  return beats
    .map((b) => {
      if (b.visual !== "clip") return { ...b, clipId: "", clipStart: 0, clipEnd: 0, clipAudio: false };
      const clip = clips.find((c) => c.id === b.clipId && c.status === "ready");
      if (!clip) return { ...b, visual: "scene" as const, clipId: "", clipStart: 0, clipEnd: 0, clipAudio: false };
      const start = Math.min(Math.max(0, b.clipStart), Math.max(0, clip.seconds - 1));
      const end = Math.min(clip.seconds, Math.max(start + 1, b.clipEnd));
      return { ...b, clipStart: +start.toFixed(2), clipEnd: +end.toFixed(2), voice: b.clipAudio ? "" : b.voice };
    })
    .filter((b) => b.voice.trim() || (b.visual === "clip" && b.clipAudio));
}

/** The display graphic appears once: a second (or third) cover beat becomes the lecturer, or a scene. */
function oneCover<T extends Omit<Beat, "id" | "motion">>(beats: T[], hasLecturer: boolean): T[] {
  let seen = false;
  return beats.map((b) => {
    if (b.visual !== "cover") return b;
    if (!seen) return ((seen = true), b);
    return { ...b, visual: hasLecturer ? ("lecturer" as const) : ("scene" as const) };
  });
}

/** The agent's first storyboard for a kit, held to the kind's length. */
export async function writeStoryboard(kind: Storyboard["kind"], voice: string, m: Material): Promise<Storyboard> {
  const draft = await structured({
    schema: draftSchema,
    system: SYSTEM,
    effort: "high",
    messages: [{ role: "user", content: `${SHAPES[kind]}\n\nהחומר:\n${JSON.stringify(material(m), null, 2)}` }],
  });
  // The voice's misreadings are fixed before the user sees the draft.
  const sb: Storyboard = { kind, voice, ...draft, beats: withIds(oneCover(checkClips(await reviewForSpeech(draft.beats), m.clips), Boolean(m.design.assets.subject))) };
  return fitLength(sb, m);
}

/** A draft that runs outside its kind's range gets one tightening (or filling) pass. */
async function fitLength(sb: Storyboard, m: Material) {
  const [min, max] = LENGTH[sb.kind];
  const seconds = estimateSeconds(sb);
  if (seconds >= min && seconds <= max) return sb;
  const target = Math.round((min + max) / 2);
  const total = sb.beats.reduce((a, b) => a + b.voice.trim().split(/\s+/).filter(Boolean).length, 0);
  const goal = words(target, sb.beats.length);
  const instruction =
    seconds > max
      ? `The video runs about ${seconds} seconds (${total} narrated words); it must be about ${target} seconds: cut to about ${goal} words in total. Tighten every line, merge or drop the weakest beat if needed; keep the hook, the name and the cta.`
      : `The video runs only about ${seconds} seconds (${total} narrated words); it must be about ${target} seconds: grow to about ${goal} words in total with substance from the material, not filler.`;
  const fitted = await reviseStoryboard(sb, instruction, m);
  // Whichever is closer to the range wins (a revision can overshoot the other way).
  const off = (x: Storyboard) => Math.max(0, min - estimateSeconds(x), estimateSeconds(x) - max);
  return off(fitted) < off(sb) ? fitted : sb;
}

/** The storyboard rewritten by the agent at the user's request ("make the hook sharper"). Beats the
 * request doesn't touch stay word for word. */
export async function reviseStoryboard(sb: Storyboard, instruction: string, m: Material): Promise<Storyboard> {
  // The agent sees each beat without the editor's id and the user's AI-video choice.
  const current = sb.beats.map((b) => Object.fromEntries(Object.entries(b).filter(([k]) => k !== "id" && k !== "motion")));
  const draft = await structured({
    schema: draftSchema,
    system: `${SYSTEM}\n\nYou are revising an existing storyboard the user is editing. Apply their request precisely; keep every beat the request does not touch exactly as it is (same words, same clip). Keep the length within the kind's range.`,
    effort: "high",
    messages: [
      {
        role: "user",
        content: `${SHAPES[sb.kind]}\n\nהחומר:\n${JSON.stringify(material(m))}\n\nהתסריט הנוכחי:\n${JSON.stringify({ music: sb.music, musicMood: sb.musicMood, captions: sb.captions, beats: current }, null, 2)}\n\nהבקשה של המשתמש: ${instruction}`,
      },
    ],
  });
  // Unchanged beats keep their ids (their place in the editor) and the user's AI-video choice.
  const beats = oneCover(checkClips(await reviewForSpeech(draft.beats), m.clips), Boolean(m.design.assets.subject)).map((b, i) => {
    const same = sb.beats.find((o) => o.voice === b.voice && o.title === b.title && o.visual === b.visual);
    return { ...b, id: same?.id ?? `b${Date.now().toString(36)}${i}`, motion: b.visual === "scene" && Boolean(same?.motion) };
  });
  return { ...sb, ...draft, beats };
}

/** A storyboard sent back by the editor, checked and trimmed. */
export function cleanStoryboard(input: unknown, base: Storyboard, clips: CourseClip[]): Storyboard | null {
  // Drafts written before shots, clips and AI video existed have none.
  const raw = input as { beats?: Record<string, unknown>[] } | null;
  if (raw?.beats) raw.beats = raw.beats.map((b) => ({ shot: "", clipId: "", clipStart: 0, clipEnd: 0, clipAudio: false, motion: false, ...b }));
  const parsed = storyboardSchema.safeParse(raw);
  if (!parsed.success) return null;
  const sb = parsed.data;
  const trimmed = sb.beats.map((b) => ({
    ...b,
    shot: b.shot.trim().slice(0, 200),
    voice: b.voice.trim().slice(0, 300),
    title: b.title.trim().slice(0, 60),
    sub: b.sub.trim().slice(0, 90),
    items: b.items.map((x) => x.trim().slice(0, 50)).filter(Boolean).slice(0, 6),
    motion: b.visual === "scene" && b.motion,
  }));
  const beats = checkClips(trimmed, clips).slice(0, 16);
  return beats.length ? { ...sb, kind: base.kind, beats } : null;
}

/** How many beats become AI video clips (each costs COST.motion). */
export const motionCount = (sb: Pick<Storyboard, "beats">) => sb.beats.filter((b) => b.visual === "scene" && b.motion).length;
