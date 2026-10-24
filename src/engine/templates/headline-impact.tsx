// "Headline impact": a huge two-tone Hebrew hook, the lecturer beside it and a giant ghost of the
// lecturer in the background. Derived from "אני יודע שאתה משקר!", "איתותים שקטים", "לב המילואים".
import { fitText } from "@remotion/layout-utils";
import { AbsoluteFill, Img, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { splitHeadline, type DesignProps } from "../design";
import { fontFamily, type FontName } from "../fonts";
import { formatFromSize, STORY_SAFE } from "../formats";
import { alpha, Grain, Vignette } from "../fx";
import { Hero, inkOn, isLightBg, Logo, logoSpace, Pill, Placed, useEnter, type Box } from "../parts";

export const HeadlineImpact: React.FC<DesignProps> = ({ brand, copy, assets, subjectSide, overrides: o }) => {
  const frame = useCurrentFrame();
  const { width: W, height: H, durationInFrames } = useVideoConfig();
  const enter = useEnter();
  const format = formatFromSize(W, H);
  // Square sits side by side like landscape: stacked, the hook took the width and left a tiny hero.
  const wide = format === "landscape" || format === "square";
  const square = format === "square";
  const story = format === "story";
  const { bg, ink, muted, accent } = brand.palette;
  const head = fontFamily(brand.headlineFont as FontName);
  const body = fontFamily(brand.bodyFont as FontName);
  const ar = assets.subject?.aspect ?? 0.62;
  const [line1, line2] = splitHeadline(copy.headline);
  const lightFrom = subjectSide === "left" ? "right" : "left";
  // A light palette keeps its own airy ground (deepened by its ink, never by black) and lifts the
  // words with a halo of the ground instead of a dark shadow.
  const light = isLightBg(bg);

  // Text column: beside the hero when wide, above it when tall.
  // In the square the column ends where the hero's box begins (plus a little shoulder), so a wide
  // photo (arms, props in hand) narrows the text instead of covering it.
  const squareHeroW = Math.min(H * 0.86 * ar, W * 0.52);
  const squareTextW = Math.max(W * 0.4, Math.min(W * 0.58, W - squareHeroW * 0.92 - W * 0.06));
  // No photo: the hook is the picture. It takes the centre of the frame, bigger, over the kit's AI
  // scene (otherwise a faint texture behind the lecturer).
  const solo = !assets.subject;
  const textBox: Box = solo
    ? wide
      ? { left: W * 0.08, top: H * 0.08, width: W * 0.84, height: H * 0.84 }
      : { left: W * 0.06, top: story ? H * (STORY_SAFE.top + 0.01) : H * 0.06, width: W * 0.88, height: H * (story ? 1 - STORY_SAFE.top - STORY_SAFE.bottom - 0.02 : 0.88) }
    : wide
    ? {
        left: subjectSide === "left" ? (square ? W * 0.95 - squareTextW : W * 0.44) : W * 0.05,
        top: H * (square ? 0.08 : 0.1),
        width: square ? squareTextW : W * 0.51,
        height: H * (square ? 0.84 : 0.8),
      }
    : { left: W * 0.06, top: story ? H * (STORY_SAFE.top + 0.01) : H * 0.06, width: W * 0.88, height: H * 0.42 };
  const fit = (t: string) =>
    t ? fitText({ text: t, withinWidth: textBox.width, fontFamily: head, fontWeight: 900 }).fontSize : Infinity;
  const headSize = Math.min(fit(line1), fit(line2), solo ? (wide ? H * 0.24 : W * 0.22) : square ? H * 0.15 : wide ? H * 0.2 : W * 0.2);

  const subSize = Math.round((wide ? H : W) * (square ? 0.05 : wide ? 0.045 : 0.052));
  // Tall: the hero fills what the text leaves, so the head never covers the hook or the pills.
  const logoH = headSize * 0.5;
  const logoRoom = logoSpace(assets.logo, logoH, textBox.width * 0.45);
  const textBottom =
    textBox.top +
    logoRoom +
    headSize * 1.02 * (line2 ? 2 : 1) +
    headSize * 0.28 +
    subSize * 1.25 * 2 +
    (copy.tags.length ? subSize * 1.8 : 0);
  const heroH = wide
    ? Math.min(H * (square ? 0.86 : 0.98), (W * (square ? 0.52 : 0.44)) / ar)
    : Math.min(H * (story ? 0.6 : 0.64), H - textBottom - H * 0.015, (W * 0.86) / ar);
  const heroBox: Box = wide
    ? {
        left: subjectSide === "left" ? W * (square ? 0 : 0.03) : W - W * (square ? 0 : 0.03) - heroH * ar,
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


  return (
    <AbsoluteFill style={{ background: bg, overflow: "hidden", direction: "rtl" }}>
      {/* Deep brand gradient with a soft beam of accent light. */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at ${lightFrom === "right" ? "75%" : "25%"} 20%, ${accent}${alpha(0.28)} 0%, transparent 55%), linear-gradient(160deg, ${bg} 0%, ${light ? `${bg} 55%, ${ink}${alpha(0.14)}` : "#000000"} 100%)`,
        }}
      />
      {assets.background && (
        <AbsoluteFill style={{ opacity: solo ? 0.62 : 0.22 }}>
          <Img src={assets.background} style={{ width: "100%", height: "100%", objectFit: "cover", filter: solo ? "blur(1px) saturate(0.9)" : "blur(6px) grayscale(0.4)" }} />
        </AbsoluteFill>
      )}
      {solo && assets.background && (
        <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 50%, ${bg}${alpha(0.7)} 0%, ${bg}${alpha(0.25)} 65%)` }} />
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
        el="headline" t={o.headline}
        style={{ display: "flex", flexDirection: "column", justifyContent: wide || solo ? "center" : "flex-start", alignItems: wide && !solo ? "flex-start" : "center", textAlign: wide && !solo ? "right" : "center" }}
      >
        <Logo logo={assets.logo} height={logoH} maxWidth={textBox.width * 0.45} bg={bg} t={o.logo} progress={l1} style={{ marginBottom: logoH * 0.4 }} />
        <div
          style={{
            fontFamily: head,
            fontWeight: 900,
            fontSize: headSize,
            lineHeight: 1.02,
            color: ink,
            opacity: l1,
            translate: `0 ${(1 - l1) * 40}px`,
            textShadow: light ? `0 0 ${headSize * 0.3}px ${bg}` : `0 ${headSize * 0.05}px ${headSize * 0.2}px #000000${alpha(0.6)}`,
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
              textShadow: light ? `0 0 ${headSize * 0.3}px ${bg}` : `0 0 ${headSize * 0.35}px ${accent}${alpha(0.45)}, 0 ${headSize * 0.05}px ${headSize * 0.2}px #000000${alpha(0.6)}`,
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
          <div style={{ display: "flex", gap: subSize * 0.4, marginTop: subSize * 0.7, opacity: subIn, flexWrap: "wrap", justifyContent: wide && !solo ? "flex-start" : "center" }}>
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
