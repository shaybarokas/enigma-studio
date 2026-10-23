// "Arch luxe": the lecturer framed in an arched window that opens onto their world, set on a calm
// solid ground with fine, spaced typography. Quiet and premium: wellness, beauty, coaching, therapy.
import { AbsoluteFill, Img, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { DesignProps } from "../design";
import { fitLines } from "../fit";
import { fontFamily, type FontName } from "../fonts";
import { formatFromSize, STORY_SAFE, type FormatId } from "../formats";
import { alpha, Grain } from "../fx";
import { Hero, isLightBg, Logo, logoSpace, Placed, useEnter, type Box } from "../parts";

type Layout = { arch: Box; text: Box; align: "center" | "start" };

// Wide formats: the arch on the lecturer's side, the text column on the other. Tall: arch on top,
// text beneath it.
// Tall: the text is sized first (textNeeded) and the arch gets the height that is left.
function layoutFor(format: FormatId, W: number, H: number, side: "left" | "right", textNeeded: number): Layout {
  const onSide = (archW: number, archH: number, top: number, margin: number, textW: number): Layout => {
    const archLeft = side === "left" ? margin : W - margin - archW;
    const textLeft = side === "left" ? W - margin - textW : margin;
    return { arch: { left: archLeft, top, width: archW, height: archH }, text: { left: textLeft, top: H * 0.12, width: textW, height: H * 0.76 }, align: "start" };
  };
  if (format === "landscape") return onSide(H * 0.56, H * 0.84, H * 0.08, W * 0.08, W * 0.5);
  if (format === "square") return onSide(W * 0.4, H * 0.8, H * 0.1, W * 0.06, W * 0.46);
  const story = format === "story";
  // The arch is a picture: in a story it may rise into the top strip (under the profile bar); the
  // text stays inside the safe area.
  const top = H * 0.06;
  const textBottom = story ? H * (1 - STORY_SAFE.bottom) : H * 0.95;
  const gap = H * 0.03;
  const archH = Math.min(H * (story ? 0.56 : 0.5), Math.max(H * 0.3, textBottom - top - gap - textNeeded));
  const archW = Math.min(W * 0.78, archH * 0.7);
  const textTop = top + archH + gap;
  return { arch: { left: (W - archW) / 2, top, width: archW, height: archH }, text: { left: W * 0.08, top: textTop, width: W * 0.84, height: textBottom - textTop }, align: "center" };
}

export const ArchLuxe: React.FC<DesignProps> = ({ brand, copy, assets, subjectSide, overrides: o }) => {
  const frame = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const enter = useEnter();
  const format = formatFromSize(W, H);
  const tall = format === "portrait" || format === "story";

  const { bg, ink, muted, accent } = brand.palette;
  const light = isLightBg(bg);
  const display = fontFamily(brand.displayFont as FontName);
  const body = fontFamily(brand.bodyFont as FontName);
  const ar = assets.subject?.aspect ?? 0.62;
  const base = tall ? W : H;

  const story = format === "story";
  const kickerSize = Math.round(base * (story ? 0.032 : tall ? 0.03 : 0.028));
  const subSize = Math.round(base * (story ? 0.052 : tall ? 0.048 : 0.044));
  // Kicker, rule, promise (two lines) and tags: what the column holds besides the wordmark.
  const logoH = kickerSize * (story ? 2 : 2.4);
  const rest = logoSpace(assets.logo, logoH, W * 0.3) + kickerSize * 2 + kickerSize * 2.3 + subSize * 1.35 * 2 + (copy.tags.length ? kickerSize * 2 : 0);
  const markFit = (width: number) => Math.min(fitLines(copy.wordmark, width, display, { letterSpacing: "0.04em", uppercase: true }), base * (story ? 0.15 : tall ? 0.14 : 0.13));
  const L = layoutFor(format, W, H, subjectSide, rest + copy.wordmark.length * markFit(W * 0.84));
  // In the side column the wordmark also gives way to the height the promise needs.
  const markSize = Math.min(markFit(L.text.width), (L.text.height - rest) / copy.wordmark.length);
  const radius = L.arch.width / 2;
  // The lecturer fills the window from just under its crown; the arch's lower edge crops the body.
  const heroH = Math.max(L.arch.height * 0.96, (L.arch.width * 1.05) / ar);
  const heroW = heroH * ar;
  const heroBox: Box = { left: (L.arch.width - heroW) / 2, top: L.arch.height * 0.1, width: heroW, height: heroH };
  const drift = interpolate(frame, [0, 150], [1.12, 1.04], { extrapolateRight: "clamp" });

  const archIn = enter(2, 36);
  const markIn = enter(12);
  const subIn = enter(22);
  const lineW = interpolate(subIn, [0, 1], [0, kickerSize * 5]);
  const center = L.align === "center";

  return (
    <AbsoluteFill style={{ background: bg, overflow: "hidden", direction: "rtl" }}>
      {/* Soft light from the arch's side, like a window in a quiet room. */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at ${L.arch.left + L.arch.width / 2}px ${L.arch.top + L.arch.height * 0.4}px, ${accent}${alpha(light ? 0.16 : 0.22)} 0%, transparent 60%)`,
        }}
      />

      {/* The window: a thin offset outline, then the scene and the lecturer inside the arch. */}
      <div
        style={{
          position: "absolute",
          left: L.arch.left - W * 0.012,
          top: L.arch.top - W * 0.012,
          width: L.arch.width + W * 0.024,
          height: L.arch.height + W * 0.024,
          borderRadius: `${radius + W * 0.012}px ${radius + W * 0.012}px ${W * 0.01}px ${W * 0.01}px`,
          border: `${Math.max(2, W * 0.0022)}px solid ${accent}${alpha(0.75)}`,
          opacity: archIn,
        }}
      />
      <div
        style={{
          position: "absolute",
          ...L.arch,
          borderRadius: `${radius}px ${radius}px ${W * 0.006}px ${W * 0.006}px`,
          overflow: "hidden",
          opacity: archIn,
          translate: `0 ${(1 - archIn) * H * 0.03}px`,
          boxShadow: `0 ${H * 0.03}px ${H * 0.08}px #000000${alpha(light ? 0.18 : 0.45)}`,
          background: muted,
        }}
      >
        <Img
          src={tall && assets.backgroundTall ? assets.backgroundTall : assets.background}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", transform: `scale(${drift})`, filter: "saturate(0.85) brightness(0.92)" }}
        />
        <AbsoluteFill style={{ background: `linear-gradient(to top, ${bg}${alpha(0.55)} 0%, transparent 45%)` }} />
        {assets.subject && <Hero src={assets.subject.src} box={heroBox} t={o.subject} bg={bg} accent={accent} lightFrom={subjectSide === "left" ? "right" : "left"} progress={enter(8)} shadow={0.35} />}
      </div>

      {/* Kicker, wordmark, a fine rule, the promise and the tags as one quiet line. */}
      <Placed
        box={L.text}
        el="wordmark"
        t={o.wordmark}
        style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: center ? "center" : "flex-start", textAlign: center ? "center" : "right" }}
      >
        <Logo logo={assets.logo} height={logoH} maxWidth={Math.min(L.text.width * 0.5, W * 0.3)} bg={bg} t={o.logo} progress={markIn} style={{ marginBottom: logoH * 0.45 }} />
        <div style={{ fontFamily: body, fontWeight: 700, fontSize: kickerSize, letterSpacing: "0.06em", color: accent, opacity: markIn, marginBottom: kickerSize * 0.9 }}>{copy.kicker}</div>
        <div style={{ direction: "ltr", display: "flex", flexDirection: "column", alignItems: center ? "center" : "flex-end", opacity: markIn, translate: `0 ${(1 - markIn) * 24}px` }}>
          {copy.wordmark.map((line, i) => (
            <div key={i} style={{ fontFamily: display, fontWeight: 900, fontSize: markSize, lineHeight: 1, letterSpacing: "0.04em", textTransform: "uppercase", color: ink, whiteSpace: "nowrap" }}>
              {line}
            </div>
          ))}
        </div>
        <div style={{ width: lineW, height: Math.max(2, kickerSize * 0.1), background: accent, margin: `${kickerSize * 1.1}px 0` }} />
        <Placed
          box={{ left: 0, top: 0, width: L.text.width, height: 0 }}
          el="subtitle"
          t={o.subtitle}
          style={{ position: "relative", height: "auto", display: "flex", flexDirection: "column", alignItems: center ? "center" : "flex-start", opacity: subIn }}
        >
          <div style={{ fontFamily: body, fontWeight: 600, fontSize: subSize, lineHeight: 1.35, color: ink, textWrap: "balance", maxWidth: L.text.width }}>{copy.subtitle}</div>
          {copy.tags.length > 0 && (
            <div style={{ marginTop: subSize * 0.7, fontFamily: body, fontWeight: 700, fontSize: kickerSize * 1.05, letterSpacing: "0.02em", color: muted }}>{copy.tags.join("   ·   ")}</div>
          )}
        </Placed>
      </Placed>

      <Grain opacity={light ? 0.06 : 0.1} />
    </AbsoluteFill>
  );
};
