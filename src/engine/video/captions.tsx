// Kinetic captions in the style of Enigma's promos: two to four bold words at a time, centred,
// popping in on the beat of the narration, with the key word in the brand's accent colour.
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { alpha } from "../fx";
import type { Scene } from "./schema";

type Chunk = { words: Scene["words"]; start: number; end: number };

// Breaks after punctuation, a long word, or four words: short bites that read at a glance.
function chunk(words: Scene["words"]): Chunk[] {
  const out: Chunk[] = [];
  let cur: Scene["words"] = [];
  const flush = () => {
    if (cur.length) out.push({ words: cur, start: cur[0].start, end: cur.at(-1)!.end });
    cur = [];
  };
  for (const w of words) {
    cur.push(w);
    const chars = cur.reduce((a, x) => a + x.text.length, 0);
    if (/[.,!?:;…]$/.test(w.text) || cur.length >= 4 || chars >= 16) flush();
  }
  flush();
  return out;
}

const clean = (s: string) => s.replace(/[.,!?:;…"״׳']/g, "");

export const Captions: React.FC<{ scene: Scene; font: string; accent: string; ink: string }> = ({ scene, font, accent, ink }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = frame / fps;
  const chunks = chunk(scene.words);
  const i = chunks.findIndex((c, k) => t >= c.start - 0.05 && t < (chunks[k + 1]?.start ?? c.end + 0.6));
  if (i < 0) return null;
  const c = chunks[i];
  const local = frame - Math.round((c.start - 0.05) * fps);
  const pop = spring({ frame: local, fps, config: { damping: 14, stiffness: 220, mass: 0.6 } });
  const emphasis = new Set(scene.emphasis.map(clean));
  const size = Math.round(width * 0.085);

  return (
    <div
      style={{
        position: "absolute",
        left: width * 0.06,
        right: width * 0.06,
        top: height * 0.6,
        display: "flex",
        justifyContent: "center",
        direction: "rtl",
        transform: `scale(${interpolate(pop, [0, 1], [0.82, 1])})`,
        opacity: interpolate(pop, [0, 0.4], [0, 1], { extrapolateRight: "clamp" }),
      }}
    >
      <div
        style={{
          fontFamily: font,
          fontWeight: 900,
          fontSize: size,
          lineHeight: 1.12,
          textAlign: "center",
          color: ink,
          textShadow: `0 ${size * 0.06}px ${size * 0.3}px #000000${alpha(0.85)}, 0 0 ${size * 0.08}px #000000${alpha(0.9)}`,
          textWrap: "balance",
        }}
      >
        {c.words.map((w, k) => {
          const spoken = t >= w.start - 0.03;
          const hot = emphasis.has(clean(w.text));
          return (
            <span key={k} style={{ color: hot ? accent : ink, opacity: spoken ? 1 : 0.55 }}>
              {w.text}
              {k < c.words.length - 1 ? " " : ""}
            </span>
          );
        })}
      </div>
    </div>
  );
};
