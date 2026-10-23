// Small edits to a finished video, applied to its render spec: what the video editor's controls do and
// what the agent asks for in words. Pure (browser and server). A new narration line can't be applied
// here (it has to be recorded): it is returned as a re-voice request and recorded when the version is
// produced; until then the editor shows the line as pending.
import { TRANSITIONS, type Scene, type TransitionKind, type VideoProps } from "@/engine/video/schema";
import { CAPTION_STYLES, type CaptionStyle } from "./storyboard-ui";

export const EDIT_OPS = ["title", "sub", "caption", "emphasis", "voice", "delete", "calm", "transition", "accent", "ink", "captions", "music"] as const;
export type EditOp = {
  op: (typeof EDIT_OPS)[number];
  scene?: number | null; // 1-based, as the user sees it
  text?: string | null;
  words?: string[] | null;
  color?: string | null; // #rrggbb
  value?: number | null; // music level 0–2, or calm 1/0
  style?: string | null; // caption style or transition
};
export type Revoice = { scene: number; text: string }; // 1-based

const clean = (w: string) => w.replace(/[.,!?:;…"״׳']/g, "");
const HEX = /^#[0-9a-f]{6}$/i;

/** The caption's words re-timed for new text: same count keeps each word's time; otherwise the new
 * words share the spoken span by their length (the narration itself is unchanged). */
export function retimeCaption(words: Scene["words"], text: string): Scene["words"] {
  const next = text.trim().split(/\s+/).filter(Boolean);
  if (!words.length || !next.length) return [];
  if (next.length === words.length) return next.map((t, i) => ({ ...words[i], text: t }));
  const start = words[0].start;
  const span = words.at(-1)!.end - start;
  const total = next.reduce((a, w) => a + w.length + 1, 0);
  let at = 0;
  return next.map((t) => {
    const s = start + (at / total) * span;
    at += t.length + 1;
    return { text: t, start: s, end: start + (at / total) * span };
  });
}

/** Applies edits to a spec. Returns the new spec and the narration lines to record again. */
export function applyEdits(spec: VideoProps, ops: EditOp[], pending: Revoice[] = []): { spec: VideoProps; revoice: Revoice[] } {
  let scenes = spec.scenes.map((s) => ({ ...s }));
  let design = spec.design;
  let captions = spec.captions;
  let musicVolume = spec.musicVolume ?? 1;
  let revoice = [...pending];
  const at = (n?: number | null) => (n && n >= 1 && n <= scenes.length ? n - 1 : -1);

  // Deletions last (they shift the numbers the other edits refer to), highest first.
  const deletes = ops.filter((o) => o.op === "delete").map((o) => at(o.scene)).filter((i) => i >= 0).sort((a, b) => b - a);
  for (const o of ops) {
    const i = at(o.scene);
    const s = scenes[i];
    switch (o.op) {
      case "title":
        if (s && o.text != null) s.title = o.text.trim().slice(0, 60);
        break;
      case "sub":
        if (s && o.text != null) s.sub = o.text.trim().slice(0, 90);
        break;
      case "caption":
        if (s && o.text != null) {
          s.words = retimeCaption(s.words, o.text);
          s.emphasis = s.emphasis.filter((w) => s.words.some((x) => clean(x.text) === clean(w)));
        }
        break;
      case "emphasis":
        if (s && o.words) s.emphasis = o.words.map(clean).filter((w) => s.words.some((x) => clean(x.text) === w)).slice(0, 4);
        break;
      case "voice":
        if (s && o.text?.trim()) revoice = [...revoice.filter((r) => r.scene !== i + 1), { scene: i + 1, text: o.text.trim().slice(0, 300) }];
        break;
      case "calm":
        if (s) s.calm = o.value == null ? !s.calm : o.value > 0;
        break;
      case "transition":
        if (s && TRANSITIONS.includes(o.style as TransitionKind)) s.transition = o.style as TransitionKind;
        break;
      case "accent":
      case "ink":
        if (o.color && HEX.test(o.color)) design = { ...design, brand: { ...design.brand, palette: { ...design.brand.palette, [o.op]: o.color.toLowerCase() } } };
        break;
      case "captions":
        if (CAPTION_STYLES.includes(o.style as CaptionStyle)) captions = o.style as CaptionStyle;
        break;
      case "music":
        if (o.value != null) musicVolume = Math.min(2, Math.max(0, o.value));
        break;
    }
  }
  for (const i of deletes) {
    if (scenes.length <= 2) break;
    scenes = scenes.filter((_, k) => k !== i);
    // Re-voice requests follow their scene's new number; the deleted one's is dropped.
    revoice = revoice.filter((r) => r.scene !== i + 1).map((r) => (r.scene > i + 1 ? { ...r, scene: r.scene - 1 } : r));
  }
  return { spec: { ...spec, scenes, design, captions, musicVolume }, revoice };
}

/** The video as the agent reads it: numbered beats with their times and words. */
export function describeSpec(spec: VideoProps) {
  let t = 0;
  return {
    accent: spec.design.brand.palette.accent,
    ink: spec.design.brand.palette.ink,
    captions: spec.captions,
    musicVolume: spec.musicVolume ?? 1,
    scenes: spec.scenes.map((s, i) => {
      const from = t;
      t += s.durationInFrames / 30;
      return {
        scene: i + 1,
        seconds: `${from.toFixed(1)}–${t.toFixed(1)}`,
        shows: s.visual,
        title: s.title,
        sub: s.sub,
        caption: s.words.map((w) => w.text).join(" "),
        emphasis: s.emphasis,
        calm: Boolean(s.calm),
        transitionToNext: s.transition,
      };
    }),
  };
}
