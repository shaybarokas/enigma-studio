// Marketing ad "hook": stops the scroll with the pain as a big two-tone question, the lecturer as
// proof, and one clear call to action.
import { fitText } from "@remotion/layout-utils";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { splitHeadline, type DesignProps } from "../design";
import { fontFamily, type FontName } from "../fonts";
import { formatFromSize, STORY_SAFE } from "../formats";
import { alpha, Glow, Grain, Vignette } from "../fx";
import { CtaButton, Hero, inkOn, MetalText, Placed, Scene, useEnter, type Box } from "../parts";

export const AdHook: React.FC<DesignProps> = ({ brand, copy, assets, subjectSide, overrides: o }) => {
  const { width: W, height: H } = useVideoConfig();
  const enter = useEnter();
  const format = formatFromSize(W, H);
  const landscape = format === "landscape";
  const story = format === "story";
  const { bg, ink, muted, accent } = brand.palette;
  const head = fontFamily(brand.headlineFont as FontName);
  const body = fontFamily(brand.bodyFont as FontName);
  const display = fontFamily(brand.displayFont as FontName);
  const ar = assets.subject?.aspect ?? 0.62;
  const [q1, q2] = splitHeadline(copy.headline);
  const lightFrom = subjectSide === "left" ? "right" : "left";
  const safeTop = story ? H * STORY_SAFE.top : H * 0.06;
  const safeBottom = story ? H * (1 - STORY_SAFE.bottom) : H * 0.94;

  // Landscape: text right, hero left. Everything else: text stacked on top, hero rising from the bottom.
  const textBox: Box = landscape
    ? { left: subjectSide === "left" ? W * 0.42 : W * 0.05, top: H * 0.1, width: W * 0.53, height: H * 0.8 }
    : { left: W * 0.07, top: safeTop + H * 0.03, width: W * 0.86, height: H * 0.4 };
  const fit = (t: string) => (t ? fitText({ text: t, withinWidth: textBox.width, fontFamily: head, fontWeight: 900 }).fontSize : Infinity);
  const qSize = Math.min(fit(q1), fit(q2), landscape ? H * 0.15 : W * 0.17);

  const heroH = Math.min(landscape ? H * 0.96 : H * (format === "square" ? 0.52 : 0.6), (W * (landscape ? 0.42 : 0.55)) / ar);
  const heroW = heroH * ar;
  const heroBox: Box = landscape
    ? { left: subjectSide === "left" ? W * 0.05 : W - W * 0.05 - heroW, top: H - heroH, width: heroW, height: heroH }
    : { left: subjectSide === "left" ? W * 0.02 : W - W * 0.02 - heroW, top: H - heroH, width: heroW, height: heroH };

  const ctaSize = Math.round((landscape ? H : W) * (story ? 0.055 : 0.045));
  const ctaBox: Box = landscape
    ? { left: textBox.left, top: H * 0.74, width: textBox.width, height: H * 0.16 }
    : {
        left: subjectSide === "left" ? W * 0.42 : W * 0.06,
        top: safeBottom - ctaSize * 3.2,
        width: W * 0.52,
        height: ctaSize * 3.2,
      };

  const qIn1 = enter(2);
  const qIn2 = enter(10);
  const heroIn = enter(16);
  const subIn = enter(22);
  const ctaIn = enter(32);
  const subSize = Math.round((landscape ? H : W) * (story ? 0.056 : 0.05));

  return (
    <AbsoluteFill style={{ background: bg, overflow: "hidden", direction: "rtl" }}>
      <Scene src={!landscape && assets.backgroundTall ? assets.backgroundTall : assets.background} bg={bg} grade={0.6} blur={8} brightness={0.55} />
      <AbsoluteFill style={{ background: `linear-gradient(to bottom, ${bg}${alpha(0.85)} 0%, ${bg}${alpha(0.4)} 45%, ${bg}${alpha(0.9)} 100%)` }} />

      <Placed box={textBox} el="headline" t={o.headline} style={{ display: "flex", flexDirection: "column", justifyContent: landscape ? "center" : "flex-start", alignItems: landscape ? "flex-start" : "center", textAlign: landscape ? "right" : "center" }}>
        <div style={{ fontFamily: head, fontWeight: 900, fontSize: qSize, lineHeight: 1.05, color: ink, opacity: qIn1, translate: `0 ${(1 - qIn1) * 40}px`, whiteSpace: "nowrap" }}>
          {q1}
        </div>
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
              textShadow: `0 0 ${qSize * 0.4}px ${accent}${alpha(0.4)}`,
            }}
          >
            {q2}
          </div>
        )}
        <div style={{ marginTop: qSize * 0.3, fontFamily: body, fontWeight: 600, fontSize: subSize, lineHeight: 1.3, color: muted, opacity: subIn, textWrap: "balance" }}>
          {copy.subtitle}
        </div>
      </Placed>

      {assets.subject && (
        <>
          <Glow x={heroBox.left + heroBox.width / 2} y={heroBox.top + heroBox.height * 0.3} size={heroBox.width * 1.4} color={accent} opacity={0.22 * heroIn} />
          <Hero src={assets.subject.src} box={heroBox} t={o.subject} bg={bg} accent={accent} lightFrom={lightFrom} progress={heroIn} />
        </>
      )}
      <AbsoluteFill style={{ background: `linear-gradient(to top, ${bg} 0%, transparent 18%)` }} />

      <Placed box={ctaBox} el="cta" t={o.cta} style={{ display: "flex", flexDirection: "column", alignItems: landscape ? "flex-start" : "center", justifyContent: "flex-end", gap: ctaSize * 0.5 }}>
        <div style={{ direction: "ltr", opacity: ctaIn }}>
          <MetalText text={copy.wordmark.join(" ")} font={display} size={ctaSize * 0.9} ink={ink} muted={muted} progress={ctaIn} />
        </div>
        <CtaButton text={copy.cta} font={body} size={ctaSize} color={accent} ink={inkOn(accent)} progress={ctaIn} />
      </Placed>

      <Vignette strength={0.45} />
      <Grain opacity={0.1} />
    </AbsoluteFill>
  );
};
