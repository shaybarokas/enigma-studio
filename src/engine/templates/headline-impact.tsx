// "Headline impact": a huge two-tone Hebrew hook, the lecturer beside it and a giant ghost of the
// lecturer in the background. Derived from "אני יודע שאתה משקר!", "איתותים שקטים", "לב המילואים".
import { fitText } from "@remotion/layout-utils";
import { AbsoluteFill, Img, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { splitHeadline, type DesignProps } from "../design";
import { fontFamily, type FontName } from "../fonts";
import { formatFromSize, STORY_SAFE } from "../formats";
import { alpha, Grain, Vignette } from "../fx";
import { Hero, inkOn, Pill, Placed, useEnter, type Box } from "../parts";

export const HeadlineImpact: React.FC<DesignProps> = ({ brand, copy, assets, subjectSide, overrides: o }) => {
  const frame = useCurrentFrame();
  const { width: W, height: H, durationInFrames } = useVideoConfig();
  const enter = useEnter();
  const format = formatFromSize(W, H);
  const wide = format === "landscape"; // square stacks like the tall formats: the hook needs the full width
  const story = format === "story";
  const { bg, ink, muted, accent } = brand.palette;
  const head = fontFamily(brand.headlineFont as FontName);
  const body = fontFamily(brand.bodyFont as FontName);
  const ar = assets.subject?.aspect ?? 0.62;
  const [line1, line2] = splitHeadline(copy.headline);
  const lightFrom = subjectSide === "left" ? "right" : "left";

  // Text column: beside the hero when wide, above it when tall.
  const textBox: Box = wide
    ? {
        left: subjectSide === "left" ? W * 0.44 : W * 0.05,
        top: H * 0.1,
        width: W * 0.51,
        height: H * 0.8,
      }
    : { left: W * 0.06, top: story ? H * (STORY_SAFE.top + 0.01) : H * 0.06, width: W * 0.88, height: H * 0.42 };
  const fit = (t: string) =>
    t ? fitText({ text: t, withinWidth: textBox.width, fontFamily: head, fontWeight: 900 }).fontSize : Infinity;
  const headSize = Math.min(fit(line1), fit(line2), wide ? H * 0.2 : W * 0.2);

  const heroH = wide ? H * 0.98 : H * (story ? 0.6 : format === "square" ? 0.56 : 0.64);
  const heroBox: Box = wide
    ? {
        left: subjectSide === "left" ? W * 0.03 : W - W * 0.03 - heroH * ar,
        top: H - heroH,
        width: heroH * ar,
        height: heroH,
      }
    : { left: (W - heroH * ar) / 2, top: H - heroH, width: heroH * ar, height: heroH };

  const ghostIn = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  const ghostDrift = interpolate(frame, [0, durationInFrames], [1.18, 1.1]);
  const heroIn = enter(10);
  const l1 = enter(4);
  const l2 = enter(12);
  const subIn = enter(22);

  const subSize = Math.round((wide ? H : W) * (wide ? 0.045 : 0.052));

  return (
    <AbsoluteFill style={{ background: bg, overflow: "hidden", direction: "rtl" }}>
      {/* Deep brand gradient with a soft beam of accent light. */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at ${lightFrom === "right" ? "75%" : "25%"} 20%, ${accent}${alpha(0.28)} 0%, transparent 55%), linear-gradient(160deg, ${bg} 0%, #000000 100%)`,
        }}
      />
      {assets.background && (
        <AbsoluteFill style={{ opacity: 0.22 }}>
          <Img src={assets.background} style={{ width: "100%", height: "100%", objectFit: "cover", filter: "blur(6px) grayscale(0.4)" }} />
        </AbsoluteFill>
      )}

      {/* Giant ghost of the lecturer: the memorable silhouette of "איתותים שקטים". */}
      {assets.subject && (
        <AbsoluteFill style={{ opacity: 0.16 * ghostIn, transform: `scale(${ghostDrift})` }}>
          <Img
            src={assets.subject.src}
            style={{
              position: "absolute",
              height: H * 1.25,
              left: wide ? (subjectSide === "left" ? W * 0.4 : W * 0.05) : W * 0.5 - H * 0.625 * ar,
              top: -H * 0.08,
              filter: `grayscale(1) brightness(1.6) blur(2px)`,
              mixBlendMode: "screen",
            }}
          />
        </AbsoluteFill>
      )}

      {/* The hook. */}
      <Placed
        box={textBox}
        t={o.headline}
        style={{ display: "flex", flexDirection: "column", justifyContent: wide ? "center" : "flex-start", alignItems: wide ? "flex-start" : "center", textAlign: wide ? "right" : "center" }}
      >
        <div
          style={{
            fontFamily: head,
            fontWeight: 900,
            fontSize: headSize,
            lineHeight: 1.02,
            color: ink,
            opacity: l1,
            translate: `0 ${(1 - l1) * 40}px`,
            textShadow: `0 ${headSize * 0.05}px ${headSize * 0.2}px #000000${alpha(0.6)}`,
            whiteSpace: "nowrap",
          }}
        >
          {line1}
        </div>
        {line2 && (
          <div
            style={{
              fontFamily: head,
              fontWeight: 900,
              fontSize: headSize,
              lineHeight: 1.02,
              color: accent,
              opacity: l2,
              translate: `0 ${(1 - l2) * 40}px`,
              textShadow: `0 0 ${headSize * 0.35}px ${accent}${alpha(0.45)}, 0 ${headSize * 0.05}px ${headSize * 0.2}px #000000${alpha(0.6)}`,
              whiteSpace: "nowrap",
            }}
          >
            {line2}
          </div>
        )}
        <div
          style={{
            marginTop: headSize * 0.28,
            fontFamily: body,
            fontWeight: 700,
            fontSize: subSize,
            lineHeight: 1.25,
            color: muted,
            maxWidth: textBox.width,
            opacity: subIn,
            textWrap: "balance",
          }}
        >
          {copy.subtitle}
        </div>
        {copy.tags.length > 0 && (
          <div style={{ display: "flex", gap: subSize * 0.4, marginTop: subSize * 0.7, opacity: subIn, flexWrap: "wrap", justifyContent: wide ? "flex-start" : "center" }}>
            {copy.tags.map((t) => (
              <Pill key={t} text={t} font={body} size={subSize * 0.7} color={accent} ink={inkOn(accent)} />
            ))}
          </div>
        )}
      </Placed>

      {assets.subject && (
        <Hero src={assets.subject.src} box={heroBox} t={o.subject} bg={bg} accent={accent} lightFrom={lightFrom} progress={heroIn} />
      )}
      <AbsoluteFill style={{ background: `linear-gradient(to top, ${bg} 0%, transparent 22%)` }} />

      <Vignette strength={0.55} />
      <Grain opacity={0.12} />
    </AbsoluteFill>
  );
};
