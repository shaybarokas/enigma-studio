// Marketing ad "hook": stops the scroll with the pain as a big two-tone question, the lecturer as
// proof, and one clear call to action.
// Landscape and square: the text (logo, question, promise, button) as one block beside the lecturer.
// Tall: the text across the top, the lecturer rising large from the bottom on one side, the brand and
// the button on the other.
import { AbsoluteFill, useVideoConfig } from "remotion";
import { splitHeadline, type DesignProps } from "../design";
import { balancedLines, fitLines } from "../fit";
import { fontFamily, type FontName } from "../fonts";
import { formatFromSize, STORY_SAFE } from "../formats";
import { alpha, Glow, Grain, Vignette } from "../fx";
import { CtaButton, Hero, inkOn, isLightBg, Logo, logoSpace, MetalText, Placed, Scene, useEnter, type Box } from "../parts";

export const AdHook: React.FC<DesignProps> = ({ brand, copy, assets, subjectSide, overrides: o }) => {
  const { width: W, height: H } = useVideoConfig();
  const enter = useEnter();
  const format = formatFromSize(W, H);
  const landscape = format === "landscape";
  const side = landscape || format === "square"; // text and lecturer side by side
  const story = format === "story";
  const { bg, ink, muted, accent } = brand.palette;
  const light = isLightBg(bg);
  const head = fontFamily(brand.headlineFont as FontName);
  const body = fontFamily(brand.bodyFont as FontName);
  const display = fontFamily(brand.displayFont as FontName);
  const ar = assets.subject?.aspect ?? 0.62;
  const [q1, q2] = splitHeadline(copy.headline);
  const lightFrom = subjectSide === "left" ? "right" : "left";
  const safeTop = story ? H * STORY_SAFE.top : H * 0.06;
  const safeBottom = story ? H * (1 - STORY_SAFE.bottom) : H * 0.94;
  const awayLeft = subjectSide === "left";

  // Side by side, the lecturer is sized first and the text takes the width they leave.
  const sideHeroH = Math.min(H * (landscape ? 0.96 : 0.86), (W * (landscape ? 0.42 : 0.5)) / ar);
  const sideHeroW = assets.subject ? sideHeroH * ar : 0;
  // The text block's width, and its parts sized to it.
  const textW = side ? Math.min(W * (landscape ? 0.52 : 0.56), W - sideHeroW * (landscape ? 1.05 : 0.92) - W * 0.08) : W * 0.86;
  const textLeft = side ? (awayLeft ? W * 0.95 - textW : W * 0.05) : W * 0.07;
  const qLines = q2 ? [q1, q2] : [q1];
  const qSize = Math.min(fitLines(qLines, textW, head) * 0.97, landscape ? H * 0.15 : W * (story ? 0.16 : side ? 0.1 : 0.14));
  const subLines = balancedLines(copy.subtitle);
  const subSize = Math.min(fitLines(subLines, textW, body) * 0.95, landscape ? H * 0.05 : W * (story ? 0.058 : side ? 0.042 : 0.05));
  const logoH = qSize * 0.55;
  const logoRoom = logoSpace(assets.logo, logoH, textW * 0.4);
  const textH = logoRoom + qSize * 1.05 * qLines.length + qSize * 0.3 + subSize * 1.3 * subLines.length;

  // The call to action: the wordmark above the button when the brand has no logo (the logo is at the top).
  const ctaSize = Math.round((landscape ? H : W) * (story ? 0.055 : side ? 0.04 : 0.046));
  const ctaH = ctaSize * 2.4 + (assets.logo ? 0 : ctaSize * 1.6);

  // Side by side: logo, question, promise and button, centred as one block. Tall: text at the top.
  const blockTop = side ? Math.max(H * 0.07, (H - (textH + ctaSize * 0.8 + ctaH)) / 2) : safeTop + H * 0.02;
  const textBox: Box = { left: textLeft, top: blockTop, width: textW, height: textH };
  const textBottom = textBox.top + textH;

  // The lecturer: as large as the space under the text allows (tall formats), half the frame (wide).
  const heroH = side
    ? sideHeroH
    : Math.min(H - textBottom - H * 0.015, H * 0.6, (W * 0.62) / ar);
  const heroW = heroH * ar;
  const heroBox: Box = side
    ? { left: awayLeft ? W * (landscape ? 0.05 : -0.04) : W - W * (landscape ? 0.05 : -0.04) - heroW, top: H - heroH, width: heroW, height: heroH }
    : { left: awayLeft ? -heroW * 0.06 : W - heroW * 0.94, top: H - heroH, width: heroW, height: heroH };

  const ctaW = side ? textW : Math.max(W * 0.44, W - heroW * 0.94 - W * 0.08);
  const ctaBox: Box = side
    ? { left: textLeft, top: textBottom + ctaSize * 0.8, width: textW, height: ctaH }
    : { left: awayLeft ? W - W * 0.05 - ctaW : W * 0.05, top: safeBottom - ctaH, width: ctaW, height: ctaH };

  const qIn1 = enter(2);
  const qIn2 = enter(10);
  const heroIn = enter(16);
  const subIn = enter(22);
  const ctaIn = enter(32);

  return (
    <AbsoluteFill style={{ background: bg, overflow: "hidden", direction: "rtl" }}>
      <Scene src={!landscape && assets.backgroundTall ? assets.backgroundTall : assets.background} bg={bg} grade={0.6} blur={8} brightness={light ? 1 : 0.55} />
      <AbsoluteFill
        style={{
          background: light
            ? `linear-gradient(to bottom, ${bg}${alpha(0.92)} 0%, ${bg}${alpha(0.72)} 45%, ${bg}${alpha(0.95)} 100%)`
            : `linear-gradient(to bottom, ${bg}${alpha(0.85)} 0%, ${bg}${alpha(0.4)} 45%, ${bg}${alpha(0.9)} 100%)`,
        }}
      />

      {assets.subject && (
        <>
          <Glow x={heroBox.left + heroBox.width / 2} y={heroBox.top + heroBox.height * 0.3} size={heroBox.width * 1.4} color={accent} opacity={0.22 * heroIn} />
          <Hero src={assets.subject.src} box={heroBox} t={o.subject} bg={bg} accent={accent} lightFrom={lightFrom} progress={heroIn} />
        </>
      )}
      <AbsoluteFill style={{ background: `linear-gradient(to top, ${bg} 0%, ${bg}${alpha(0.6)} 10%, transparent 26%)` }} />

      <Placed
        box={textBox}
        el="headline"
        t={o.headline}
        style={{ display: "flex", flexDirection: "column", alignItems: side ? "flex-start" : "center", textAlign: side ? "right" : "center" }}
      >
        <Logo logo={assets.logo} height={logoH} maxWidth={textW * 0.4} bg={bg} t={o.logo} progress={qIn1} style={{ marginBottom: logoH * 0.4 }} />
        <div style={{ fontFamily: head, fontWeight: 900, fontSize: qSize, lineHeight: 1.05, color: ink, opacity: qIn1, translate: `0 ${(1 - qIn1) * 40}px`, whiteSpace: "nowrap" }}>{q1}</div>
        {q2 && (
          <div
            style={{
              fontFamily: head,
              fontWeight: 900,
              fontSize: qSize,
              lineHeight: 1.05,
              color: accent,
              opacity: qIn2,
              translate: `0 ${(1 - qIn2) * 40}px`,
              whiteSpace: "nowrap",
              textShadow: light ? "none" : `0 0 ${qSize * 0.4}px ${accent}${alpha(0.4)}`,
            }}
          >
            {q2}
          </div>
        )}
        <div style={{ marginTop: qSize * 0.3, fontFamily: body, fontWeight: 600, fontSize: subSize, lineHeight: 1.3, color: light ? ink : muted, opacity: subIn }}>
          {subLines.map((l, i) => (
            <div key={i} style={{ whiteSpace: "nowrap" }}>
              {l}
            </div>
          ))}
        </div>
      </Placed>

      <Placed box={ctaBox} el="cta" t={o.cta} style={{ display: "flex", flexDirection: "column", alignItems: side ? "flex-start" : "center", justifyContent: "flex-end", gap: ctaSize * 0.5 }}>
        {/* Without a logo, the brand's name stands above the button (metal on dark grounds, solid ink on light). */}
        {!assets.logo && (
          <div style={{ direction: "ltr", opacity: ctaIn }}>
            <MetalText
              text={copy.wordmark.join(" ")}
              font={display}
              size={Math.min(ctaSize * (light ? 1.1 : 0.95), fitLines([copy.wordmark.join(" ")], ctaW, display, { uppercase: true }))}
              ink={ink}
              muted={muted}
              tint={light ? ink : undefined}
              progress={ctaIn}
            />
          </div>
        )}
        <CtaButton text={copy.cta} font={body} size={ctaSize} color={accent} ink={inkOn(accent)} progress={ctaIn} />
      </Placed>

      <Vignette strength={light ? 0.25 : 0.45} />
      <Grain opacity={0.1} />
    </AbsoluteFill>
  );
};
