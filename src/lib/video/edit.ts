// The editor's decisions, made once the narration is recorded: how long each beat holds (on the
// music's grid, never cutting a word), where the camera cuts inside a long beat, and how each beat
// hands over to the next. A promo cuts like a trailer (hard cuts, a flash on the reveal, a fade to
// the end card); a marketing video like a strong reel (whips and punch-ins on every change of picture).
import { FPS, TRANSITION_FRAMES, type Scene, type TransitionKind } from "@/engine/video/schema";
import type { Word } from "./audio";
import type { Beat, Storyboard } from "./storyboard";

type Voiced = { beat: Beat; seconds: number; words: Word[] };

// The least a picture needs on screen to land, by what it shows.
function minSeconds(b: Beat) {
  if (b.role === "cta") return 4.2;
  if (b.visual === "list") return 1.4 + Math.max(3, b.items.length) * 0.75;
  return { lecturer: 2.4, scene: 2.2, cover: 2.8, props: 2.6, logo: 2.6, list: 3.5 }[b.visual];
}

/** Tempo from the music prompt ("… 100 bpm …"); the cut grid follows it. */
export function bpmOf(prompt: string) {
  const m = prompt.match(/(\d{2,3})\s*bpm/i);
  const bpm = m ? Number(m[1]) : 110;
  return Math.min(160, Math.max(70, bpm));
}

function transitionInto(kind: Storyboard["kind"], cur: Beat, next: Beat, seenLecturer: boolean, i: number): TransitionKind {
  if (next.role === "cta") return kind === "promo" ? "fade" : "zoom";
  if (next.role === "intro") return "flash";
  if (kind === "promo") {
    if (next.visual === "lecturer" && !seenLecturer) return "zoom";
    return "cut";
  }
  if (next.visual === cur.visual) return "cut";
  return i % 2 ? "whip" : "zoom";
}

// A cut inside the beat at the word boundary nearest its middle, when the beat is long enough for
// two shots (wide, then close) and the picture can be reframed.
function innerCut(v: Voiced, lead: number): number | undefined {
  if (!["lecturer", "scene", "cover", "props"].includes(v.beat.visual) || v.seconds < 3.2) return undefined;
  const mid = v.seconds / 2;
  const candidates = v.words.slice(1).filter((w) => w.start > 1.2 && v.seconds - w.start > 1.2);
  if (!candidates.length) return undefined;
  const best = candidates.reduce((a, w) => (Math.abs(w.start - mid) < Math.abs(a.start - mid) ? w : a));
  return lead + Math.round(best.start * FPS) - 2; // a breath before the word
}

/**
 * The beats as timed scenes. Each beat's narration starts a few frames after its picture (the cut
 * leads the voice); a beat ends on the music grid after its last word, and never while the next
 * transition would cover a word.
 */
export function edit(kind: Storyboard["kind"], voiced: Voiced[], musicPrompt: string, images: Record<string, string>): Scene[] {
  const grid = (FPS * 60) / bpmOf(musicPrompt) / 2; // half a beat, in frames
  let seenLecturer = false;
  const transitions = voiced.map((v, i) => {
    const next = voiced[i + 1];
    if (v.beat.visual === "lecturer") seenLecturer = true;
    return next ? transitionInto(kind, v.beat, next.beat, seenLecturer, i) : "cut";
  });
  return voiced.map((v, i) => {
    const lead = i === 0 ? 8 : 4 + (i > 0 ? TRANSITION_FRAMES[transitions[i - 1]] / 2 : 0);
    const out = TRANSITION_FRAMES[transitions[i]];
    const tail = Math.round(FPS * (v.beat.role === "cta" ? 1.4 : 0.3));
    const needed = Math.max(Math.round(minSeconds(v.beat) * FPS), lead + Math.ceil(v.seconds * FPS) + tail) + out;
    const durationInFrames = Math.ceil(needed / grid) * grid;
    return {
      role: v.beat.role,
      visual: v.beat.visual,
      voice: v.beat.voice,
      emphasis: v.beat.emphasis.filter((w) => v.beat.voice.includes(w)),
      title: v.beat.title,
      sub: v.beat.sub,
      items: v.beat.items.filter(Boolean),
      image: images[v.beat.id],
      // Word times move with the lead, so the captions stay on the voice.
      words: v.words.map((w) => ({ ...w, start: w.start + lead / FPS, end: w.end + lead / FPS })),
      lead: Math.round(lead),
      durationInFrames: Math.round(durationInFrames),
      cut: innerCut(v, Math.round(lead)),
      transition: transitions[i],
    } satisfies Scene;
  });
}
