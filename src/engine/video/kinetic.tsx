// Kinetic typography: the beat's title as motion. In a marketing video the words slam in one after
// another and the key word gets a highlight; in a promo the lines rise out of a mask and the letters
// settle, like a trailer card. Every title is measured and sized to fit its zone: nothing is cut.
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { balancedLines, fitLines } from "../fit";
import { alpha } from "../fx";
import { inkOn } from "../parts";

/** Zones of the 9:16 frame (fractions of its height). Titles and captions never share one, and the
 * captions stay above the platform's own buttons and text at the bottom. */
export const ZONES = {
  top: { top: 0.1, height: 0.2 },
  middle: { top: 0.33, height: 0.24 },
  captions: 0.735, // centre line of the captions
} as const;

export const titleLines = balancedLines;

const clean = (s: string) => s.replace(/[.,!?:;…"״׳']/g, "");

// The words that land one by one. A run of non-Hebrew words ("THE LONG GAME", "Mother Dough")
// lands as one piece: split into separate boxes inside a right-to-left line, its order would flip.
function tokens(line: string): string[] {
  const out: string[] = [];
  for (const w of line.split(" ").filter(Boolean)) {
    const latin = !/[\u0590-\u05FF]/.test(w) && /[A-Za-z]/.test(w);
    const prev = out.at(-1);
    if (latin && prev && !/[\u0590-\u05FF]/.test(prev) && /[A-Za-z]/.test(prev)) out[out.length - 1] = `${prev} ${w}`;
    else out.push(w);
  }
  return out;
}

type TitleProps = {
  text: string;
  sub?: string;
  zone: { top: number; height: number };
  font: string;
  subFont: string;
  ink: string;
  accent: string;
  kind: "promo" | "marketing";
  emphasis?: string[];
  glow: string; // the ground's colour: the soft halo that lifts the words off the picture
  delay?: number; // frames
  align?: "center" | "start";
};

export const KineticTitle: React.FC<TitleProps> = ({ text, sub, zone, font, subFont, ink, accent, kind, emphasis = [], glow, delay = 0, align = "center" }) => {
  const frame = useCurrentFrame() - delay;
  const { fps, width: W, height: H } = useVideoConfig();
  if (!text.trim()) return null;
  const lines = titleLines(text);
  const boxW = W * 0.86;
  const subSize = sub ? Math.min(W * 0.05, fitLines([sub], boxW, subFont)) : 0;
  const room = zone.height * H - (sub ? subSize * 1.6 : 0);
  // Largest size that fits the width (every line) and the zone's height (all lines).
  const size = Math.min(fitLines(lines, boxW, font) * 0.96, room / (lines.length * 1.08), W * (kind === "promo" ? 0.12 : 0.135));
  const hot = new Set(emphasis.map(clean));
  const halo = `0 0 ${size * 0.35}px ${glow}${alpha(0.9)}, 0 0 ${size * 0.12}px ${glow}${alpha(0.7)}`;
  let index = 0;

  return (
    <div
      style={{
        position: "absolute",
        top: zone.top * H,
        height: zone.height * H,
        left: (W - boxW) / 2,
        width: boxW,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: align === "center" ? "center" : "flex-start",
        textAlign: align === "center" ? "center" : "right",
        direction: "rtl",
        gap: size * 0.12,
      }}
    >
      {lines.map((line, li) => {
        if (kind === "promo") {
          // The line rises out of a mask while its letters settle.
          const p = spring({ frame: frame - li * 6, fps, config: { damping: 200 }, durationInFrames: 22 });
          return (
            // Clipped only below the line (the halo around it stays whole).
            <div key={li} style={{ clipPath: "inset(-60% -30% -6% -30%)" }}>
              <div
                style={{
                  fontFamily: font,
                  fontWeight: 900,
                  fontSize: size,
                  lineHeight: 1.04,
                  color: ink,
                  whiteSpace: "nowrap",
                  transform: `translateY(${(1 - p) * 105}%)`,
                  letterSpacing: `${interpolate(p, [0, 1], [0.12, 0])}em`,
                  textShadow: halo,
                }}
              >
                {line}
              </div>
            </div>
          );
        }
        // Marketing: word by word, each one landing from big to its place.
        return (
          <div key={li} style={{ fontFamily: font, fontWeight: 900, fontSize: size, lineHeight: 1.08, color: ink, whiteSpace: "nowrap" }}>
            {tokens(line).map((w, k, arr) => {
              const at = index++ * 3;
              const p = spring({ frame: frame - at, fps, config: { damping: 16, stiffness: 260, mass: 0.6 } });
              const isHot = hot.has(clean(w));
              const sweep = spring({ frame: frame - at - 4, fps, config: { damping: 200 }, durationInFrames: 10 });
              return (
                <span key={k} style={{ position: "relative", display: "inline-block", marginInlineEnd: k < arr.length - 1 ? "0.25em" : 0 }}>
                  {isHot && (
                    <span
                      style={{
                        position: "absolute",
                        inset: `${size * 0.08}px -${size * 0.12}px ${size * 0.02}px`,
                        background: accent,
                        borderRadius: size * 0.14,
                        transform: `scaleX(${sweep})`,
                        transformOrigin: "right",
                        zIndex: 0,
                      }}
                    />
                  )}
                  <span
                    style={{
                      position: "relative",
                      display: "inline-block",
                      color: isHot ? inkOn(accent) : ink,
                      opacity: interpolate(p, [0, 0.3], [0, 1], { extrapolateRight: "clamp" }),
                      transform: `scale(${interpolate(p, [0, 1], [1.7, 1])})`,
                      textShadow: isHot ? "none" : halo,
                    }}
                  >
                    {w}
                  </span>
                </span>
              );
            })}
          </div>
        );
      })}
      {sub && (
        <div
          style={{
            fontFamily: subFont,
            fontWeight: 600,
            fontSize: subSize,
            color: ink,
            opacity: interpolate(frame, [14, 26], [0, 0.88], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
            transform: `translateY(${interpolate(frame, [14, 26], [subSize * 0.6, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}px)`,
            whiteSpace: "nowrap",
            marginTop: size * 0.1,
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
};

export { splitPrice } from "../price";

export const PriceTitle: React.FC<{ price: string; rest: string; zone: { top: number; height: number }; font: string; subFont: string; ink: string; accent: string; delay?: number }> = ({
  price,
  rest,
  zone,
  font,
  subFont,
  ink,
  accent,
  delay = 0,
}) => {
  const frame = useCurrentFrame() - delay;
  const { fps, width: W, height: H } = useVideoConfig();
  const p = spring({ frame, fps, config: { damping: 12, stiffness: 180, mass: 0.7 } });
  const big = Math.min(fitLines([price], W * 0.8, font), zone.height * H * 0.62, W * 0.3);
  const small = rest ? Math.min(fitLines([rest], W * 0.84, subFont), W * 0.06) : 0;
  return (
    <div style={{ position: "absolute", top: zone.top * H, height: zone.height * H, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", direction: "rtl", gap: big * 0.06 }}>
      <div
        style={{
          fontFamily: font,
          fontWeight: 900,
          fontSize: big,
          lineHeight: 1,
          color: accent,
          direction: "ltr",
          transform: `scale(${interpolate(p, [0, 1], [1.8, 1])})`,
          opacity: interpolate(p, [0, 0.25], [0, 1], { extrapolateRight: "clamp" }),
          textShadow: `0 ${big * 0.04}px ${big * 0.3}px ${accent}${alpha(0.45)}`,
          whiteSpace: "nowrap",
        }}
      >
        {price}
      </div>
      {rest && (
        <div style={{ fontFamily: subFont, fontWeight: 700, fontSize: small, color: ink, whiteSpace: "nowrap", opacity: interpolate(frame, [10, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
          {rest}
        </div>
      )}
    </div>
  );
};
