// "Cinematic poster": the lecturer as hero against a graded scene, a metallic brand wordmark and a
// Hebrew promise. Derived from Enigma's course covers (BRICK BOSS, CODE TO CODE, LOAN LOGIC).
import { AbsoluteFill, interpolate, useVideoConfig } from "remotion";
import type { DesignProps } from "../design";
import { fontFamily, type FontName } from "../fonts";
import { formatFromSize, STORY_SAFE, type FormatId } from "../formats";
import { alpha, Glow, Grain, Vignette } from "../fx";
import { fitLines } from "../fit";
import { Hero, Logo, logoSpace, MetalText, Placed, Scene, useEnter, type Box } from "../parts";

type Layout = {
  subject: Box;
  wordmark: Box & { align: "center" | "end" };
  subtitle: Box & { align: "center" | "end" };
  sideFade: number; // 0 = none; otherwise how far the text-side gradient reaches (fraction of width)
  bottomFade: number; // fraction of height
  maxWordmark: number; // px cap for the wordmark size
};

// Every format gets its own composition, not a crop of the landscape one.
function layoutFor(format: FormatId, W: number, H: number, ar: number, side: "left" | "right"): Layout {
  const mirror = (b: Box): Box => (side === "left" ? b : { ...b, left: W - b.left - b.width });
  if (format === "landscape") {
    const h = Math.min(H * 0.97, (W * 0.42) / ar);
    const textW = W * 0.46;
    const textLeft = side === "left" ? W - W * 0.06 - textW : W * 0.06;
    return {
      subject: mirror({ left: W * 0.07, top: H - h, width: h * ar, height: h }),
      wordmark: { left: textLeft, top: H * 0.13, width: textW, height: H * 0.42, align: "end" },
      subtitle: { left: textLeft, top: H * 0.62, width: textW, height: H * 0.28, align: "end" },
      sideFade: 0.62,
      bottomFade: 0.35,
      maxWordmark: H * 0.2,
    };
  }
  if (format === "square") {
    const h = Math.min(H * 0.8, (W * 0.5) / ar);
    // Wordmark and promise share the column opposite the hero. It may reach a quarter into the
    // hero's box (shoulder), never to the face, whatever the photo's width.
    const sw = h * ar;
    const textW = Math.min(W * 0.62, Math.max(W * 0.42, W * 0.92 - sw * 0.75));
    const textLeft = side === "left" ? W - W * 0.06 - textW : W * 0.06;
    return {
      subject: mirror({ left: W * 0.02, top: H - h, width: sw, height: h }),
      wordmark: { left: textLeft, top: H * 0.07, width: textW, height: H * 0.4, align: "end" },
      subtitle: { left: textLeft, top: H * 0.6, width: textW, height: H * 0.32, align: "end" },
      sideFade: 0.7,
      bottomFade: 0.45,
      maxWordmark: H * 0.16,
    };
  }
  // Tall formats: wordmark on top, hero centred, promise over a deep bottom fade.
  // The hero's box is settled once the wordmark's real size is known (see fitTall).
  const story = format === "story";
  const top = story ? H * (STORY_SAFE.top + 0.01) : H * 0.06;
  const subtitleBottom = story ? H * (1 - STORY_SAFE.bottom) : H * 0.95;
  const subtitleH = H * (story ? 0.2 : 0.22);
  return {
    subject: { left: 0, top: 0, width: 0, height: 0 },
    wordmark: { left: W * 0.07, top, width: W * 0.86, height: H * 0.24, align: "center" },
    subtitle: { left: W * 0.07, top: subtitleBottom - subtitleH, width: W * 0.86, height: subtitleH, align: "center" },
    sideFade: 0,
    bottomFade: story ? 0.55 : 0.5,
    maxWordmark: W * 0.24,
  };
}

// Tall formats: the head tucks just under the wordmark (magazine-cover depth), never over its middle.
function fitTall(L: Layout, W: number, H: number, ar: number, lines: number, markSize: number, logoH = 0): Box {
  const markBottom = L.wordmark.top + logoH + lines * markSize * 0.95;
  const top = Math.max(markBottom - markSize * 0.3, H * 0.24);
  // Big and close: the hero runs off the bottom edge (chest crop) instead of shrinking to fit.
  const w = Math.max(W * 0.86, (H - top) * ar);
  return { left: (W - w) / 2, top, width: w, height: w / ar };
}

export const CinematicPoster: React.FC<DesignProps> = ({ brand, copy, assets, subjectSide, overrides: o }) => {
  const { width: W, height: H } = useVideoConfig();
  const enter = useEnter();
  const format = formatFromSize(W, H);
  const tall = format === "portrait" || format === "story";
  const ar = assets.subject?.aspect ?? 0.62;
  const L = layoutFor(format, W, H, ar, subjectSide);
  const { bg, ink, muted, accent } = brand.palette;
  const display = fontFamily(brand.displayFont as FontName);
  const body = fontFamily(brand.bodyFont as FontName);

  // Wordmark size: the largest that fits the widest line, capped so it never shouts over the face.
  const markSize = Math.min(L.maxWordmark, fitLines(copy.wordmark, L.wordmark.width, display, { letterSpacing: "0.02em", uppercase: true }));
  // The brand's logo sits above the wordmark, a little over half its height.
  const logoH = markSize * 0.55;
  const logoRoom = logoSpace(assets.logo, logoH, L.wordmark.width * 0.5);
  if (tall) L.subject = fitTall(L, W, H, ar, copy.wordmark.length, markSize, logoRoom);
  const base = format === "landscape" ? H : W;
  const subtitleSize = Math.round(base * (format === "landscape" ? 0.052 : format === "story" ? 0.074 : 0.064));
  const kickerSize = Math.round(subtitleSize * 0.6);
  const justify = (a: "center" | "end") => (a === "center" ? "center" : "flex-start");
  // Scene light comes from the text side; the hero's far side falls into shadow.
  const lightFrom = subjectSide === "left" ? "right" : "left";

  const subjectIn = enter(6);
  const markIn = enter(14);
  const subIn = enter(24);

  return (
    <AbsoluteFill style={{ background: bg, overflow: "hidden", direction: "rtl" }}>
      <Scene src={tall && assets.backgroundTall ? assets.backgroundTall : assets.background} bg={bg} />
      {L.sideFade > 0 && (
        <AbsoluteFill
          style={{
            background: `linear-gradient(${lightFrom === "right" ? "to left" : "to right"}, ${bg}${alpha(0.9)} 0%, ${bg}${alpha(0.55)} ${L.sideFade * 55}%, transparent ${L.sideFade * 100}%)`,
          }}
        />
      )}

      {/* Brand wordmark sits behind the hero. */}
      <Placed
        box={L.wordmark}
        el="wordmark" t={o.wordmark}
        style={{ display: "flex", flexDirection: "column", alignItems: L.wordmark.align === "center" ? "center" : "flex-end", direction: "ltr" }}
      >
        <Logo logo={assets.logo} height={logoH} maxWidth={L.wordmark.width * 0.5} bg={bg} t={o.logo} progress={markIn} style={{ marginBottom: logoH * 0.4 }} />
        {copy.wordmark.map((line, i) => (
          <MetalText key={i} text={line} font={display} size={markSize} ink={ink} muted={muted} progress={markIn} />
        ))}
      </Placed>

      {assets.subject && (
        <>
          <Glow
            x={L.subject.left + L.subject.width / 2}
            y={L.subject.top + L.subject.height * 0.3}
            size={L.subject.width * 1.5}
            color={accent}
            opacity={0.2 * subjectIn}
          />
          <Hero src={assets.subject.src} box={L.subject} t={o.subject} bg={bg} accent={accent} lightFrom={lightFrom} progress={subjectIn} />
        </>
      )}

      <AbsoluteFill
        style={{
          background: `linear-gradient(to top, ${bg} 0%, ${bg}${alpha(0.85)} ${L.bottomFade * 40}%, transparent ${L.bottomFade * 100}%)`,
        }}
      />

      {/* The promise, in Hebrew. */}
      <Placed
        box={L.subtitle}
        el="subtitle" t={o.subtitle}
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          alignItems: justify(L.subtitle.align),
          textAlign: L.subtitle.align === "center" ? "center" : "right",
          opacity: subIn,
          translate: `0 ${(1 - subIn) * 30}px`,
        }}
      >
        <div style={{ fontFamily: body, fontWeight: 700, fontSize: kickerSize, color: accent, letterSpacing: "0.04em", marginBottom: kickerSize * 0.35 }}>
          {copy.kicker}
        </div>
        <div
          style={{
            width: interpolate(subIn, [0, 1], [0, kickerSize * 3.2]),
            height: Math.max(3, kickerSize * 0.12),
            background: accent,
            borderRadius: 4,
            marginBottom: kickerSize * 0.55,
            boxShadow: `0 0 ${kickerSize}px ${accent}${alpha(0.7)}`,
          }}
        />
        <div
          style={{
            fontFamily: body,
            fontWeight: 800,
            fontSize: subtitleSize,
            lineHeight: 1.15,
            color: ink,
            textShadow: `0 4px 24px #000000${alpha(0.75)}`,
            textWrap: "balance",
          }}
        >
          {copy.subtitle}
        </div>
      </Placed>

      <Vignette strength={0.5} />
      <Grain opacity={0.12} />
    </AbsoluteFill>
  );
};
