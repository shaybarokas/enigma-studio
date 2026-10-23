// Captions in the style the user picked: "bold" (big white words with an outline, the key word in
// the accent), "box" (white on a dark rounded box, for busy pictures) or "minimal" (smaller, calm, for
// premium videos). They always sit in their own zone, under the titles and above the platform's
// buttons, and break into bites short enough to read at a glance.
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { fitLines } from "../fit";
import { alpha } from "../fx";
import { inkOn, luminance } from "../parts";
import { ZONES } from "./kinetic";
import type { Scene } from "./schema";

type Style = "bold" | "box" | "minimal";
type Chunk = { words: Scene["words"]; start: number; end: number };

const MAX_WORDS: Record<Style, number> = { bold: 3, box: 5, minimal: 6 };
const MAX_CHARS: Record<Style, number> = { bold: 16, box: 26, minimal: 32 };

// Breaks after punctuation or when the bite is full.
function chunk(words: Scene["words"], style: Style): Chunk[] {
  const out: Chunk[] = [];
  let cur: Scene["words"] = [];
  const flush = () => {
    if (cur.length) out.push({ words: cur, start: cur[0].start, end: cur.at(-1)!.end });
    cur = [];
  };
  for (const w of words) {
    if (cur.length && cur.reduce((a, x) => a + x.text.length + 1, 0) + w.text.length > MAX_CHARS[style]) flush();
    cur.push(w);
    if (/[.,!?:;…]$/.test(w.text) || cur.length >= MAX_WORDS[style]) flush();
  }
  flush();
  return out;
}

const clean = (s: string) => s.replace(/[.,!?:;…"״׳']/g, "");

export const Captions: React.FC<{ scene: Scene; style: Style; font: string; accent: string }> = ({ scene, style, font, accent }) => {
  const frame = useCurrentFrame();
  const { fps, width: W, height: H } = useVideoConfig();
  const t = frame / fps;
  const chunks = chunk(scene.words, style);
  const i = chunks.findIndex((c, k) => t >= c.start - 0.05 && t < (chunks[k + 1]?.start ?? c.end + 0.5) - 0.02);
  if (i < 0) return null;
  const c = chunks[i];
  const local = frame - Math.round((c.start - 0.05) * fps);
  const pop = spring({ frame: local, fps, config: { damping: 14, stiffness: 240, mass: 0.55 } });
  const emphasis = new Set(scene.emphasis.map(clean));
  const text = c.words.map((w) => w.text).join(" ");
  const maxW = W * 0.86;
  const base = { bold: W * 0.082, box: W * 0.06, minimal: W * 0.05 }[style];
  // Never wider than the frame: a long bite gets a smaller size, not a cut.
  const size = Math.min(base, fitLines([text], maxW * (style === "box" ? 0.86 : 1), font) * (style === "bold" ? 1.02 : 1));
  const brightAccent = luminance(accent) > 0.22;

  const words = c.words.map((w, k) => {
    const spoken = t >= w.start - 0.03;
    const hot = emphasis.has(clean(w.text));
    let st: React.CSSProperties = {};
    if (hot && style === "bold")
      st = brightAccent
        ? { color: accent }
        : { color: inkOn(accent), background: accent, WebkitTextStroke: 0, textShadow: "none", borderRadius: size * 0.18, padding: `0 ${size * 0.16}px` };
    if (hot && style === "box") st = { color: brightAccent ? accent : "#ffffff", textDecoration: brightAccent ? undefined : `underline ${accent}` };
    if (hot && style === "minimal") st = { fontWeight: 800 };
    const dim = style === "bold" && !spoken ? 0.5 : 1;
    return (
      <span key={k} style={{ ...st, opacity: dim }}>
        {w.text}
        {k < c.words.length - 1 ? " " : ""}
      </span>
    );
  });

  const look: Record<Style, React.CSSProperties> = {
    bold: {
      fontWeight: 900,
      color: "#ffffff",
      WebkitTextStroke: `${Math.max(2, size * 0.07)}px #000000${alpha(0.85)}`,
      paintOrder: "stroke fill",
      textShadow: `0 ${size * 0.06}px ${size * 0.3}px #000000${alpha(0.85)}`,
    },
    box: {
      fontWeight: 800,
      color: "#ffffff",
      background: `#0b0b12${alpha(0.78)}`,
      padding: `${size * 0.22}px ${size * 0.5}px`,
      borderRadius: size * 0.4,
      boxDecorationBreak: "clone",
    },
    minimal: {
      fontWeight: 600,
      color: "#ffffff",
      textShadow: `0 1px ${size * 0.25}px #000000${alpha(0.9)}, 0 0 ${size * 0.6}px #000000${alpha(0.5)}`,
      letterSpacing: "0.01em",
    },
  };

  return (
    <div
      style={{
        position: "absolute",
        left: (W - maxW) / 2,
        width: maxW,
        top: ZONES.captions * H - size * 0.7,
        display: "flex",
        justifyContent: "center",
        direction: "rtl",
        transform: style === "minimal" ? undefined : `scale(${interpolate(pop, [0, 1], [0.85, 1])})`,
        opacity: interpolate(pop, [0, 0.4], [0, 1], { extrapolateRight: "clamp" }),
      }}
    >
      <div style={{ fontFamily: font, fontSize: size, lineHeight: 1.15, textAlign: "center", whiteSpace: "nowrap", ...look[style] }}>{words}</div>
    </div>
  );
};
