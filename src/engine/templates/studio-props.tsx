// "Studio with props": a bright studio backdrop, the lecturer, and 3D objects from the course's world
// floating around them with depth of field. Derived from SWING & WIN, PREDICT & PROFIT, LOAN LOGIC.
import { fitText } from "@remotion/layout-utils";
import { AbsoluteFill, Img, useCurrentFrame, useVideoConfig } from "remotion";
import type { DesignProps } from "../design";
import { fontFamily, type FontName } from "../fonts";
import { formatFromSize, STORY_SAFE } from "../formats";
import { alpha, Grain } from "../fx";
import { Hero, inkOn, Pill, Placed, useEnter, type Box } from "../parts";

// Where props float, as fractions of the frame: x, y, size (of the shorter side), blur, depth.
// Near props are big and blurred (in front of the lens), far ones small and sharp.
const SPOTS: Record<"wide" | "tall", [number, number, number, number, number][]> = {
  wide: [
    [0.08, 0.2, 0.34, 0, 1],
    [0.42, 0.62, 0.22, 0, 0.6],
    [0.9, 0.78, 0.42, 5, 1.4],
    [0.3, 0.06, 0.16, 2, 0.5],
    [0.62, 0.12, 0.14, 0, 0.4],
  ],
  tall: [
    [0.12, 0.42, 0.3, 0, 1],
    [0.88, 0.5, 0.26, 0, 0.8],
    [0.08, 0.84, 0.42, 6, 1.4],
    [0.9, 0.9, 0.36, 4, 1.3],
    [0.86, 0.3, 0.12, 2, 0.4],
  ],
};

export const StudioProps: React.FC<DesignProps> = ({ brand, copy, assets, subjectSide, overrides: o }) => {
  const frame = useCurrentFrame();
  const { width: W, height: H, fps } = useVideoConfig();
  const enter = useEnter();
  const format = formatFromSize(W, H);
  const wide = format === "landscape" || format === "square";
  const story = format === "story";
  const { bg, ink, accent } = brand.palette;
  const display = fontFamily(brand.displayFont as FontName);
  const body = fontFamily(brand.bodyFont as FontName);
  const ar = assets.subject?.aspect ?? 0.62;
  const lightFrom = subjectSide === "left" ? "right" : "left";
  const short = Math.min(W, H);

  const markBox: Box = wide
    ? {
        left: subjectSide === "left" ? W * (format === "landscape" ? 0.47 : 0.53) : W * 0.05,
        top: H * 0.08,
        width: W * (format === "landscape" ? 0.48 : 0.42),
        height: H * 0.5,
      }
    : { left: W * 0.06, top: story ? H * (STORY_SAFE.top + 0.01) : H * 0.05, width: W * 0.88, height: H * 0.26 };
  const longest = copy.wordmark.reduce((a, b) => (b.length > a.length ? b : a), "");
  const markSize = Math.min(
    fitText({ text: longest, withinWidth: markBox.width, fontFamily: display, fontWeight: 900 }).fontSize,
    wide ? H * 0.22 : W * 0.26,
  );

  const heroH = wide ? H * 0.95 : H * (story ? 0.58 : 0.62);
  const heroBox: Box = wide
    ? {
        left: subjectSide === "left" ? W * (format === "landscape" ? 0.12 : 0.02) : W - W * (format === "landscape" ? 0.1 : 0.02) - heroH * ar,
        top: H - heroH,
        width: heroH * ar,
        height: heroH,
      }
    : { left: (W - heroH * ar) / 2, top: H - heroH, width: heroH * ar, height: heroH };

  const subBox: Box = wide
    ? { left: markBox.left, top: H * 0.66, width: markBox.width, height: H * 0.26 }
    : { left: W * 0.06, top: H * (story ? 1 - STORY_SAFE.bottom - 0.12 : 0.84), width: W * 0.88, height: H * 0.12 };

  const heroIn = enter(8);
  const markIn = enter(2);
  const subIn = enter(20);
  const spots = SPOTS[wide ? "wide" : "tall"];
  const subSize = Math.round((wide ? H : W) * (format === "landscape" ? 0.048 : 0.058));

  const prop = (i: number, front: boolean) => {
    const img = assets.props[i % Math.max(assets.props.length, 1)];
    const spot = spots.at(i);
    if (!img || !spot) return null;
    const [x, y, s, blur, depth] = spot;
    if (front !== depth > 1) return null;
    const size = short * s;
    const pIn = enter(4 + i * 4, 24);
    const bob = Math.sin((frame / fps) * 1.6 + i * 1.3) * size * 0.04 * depth;
    const spin = Math.sin((frame / fps) * 0.8 + i) * 6 + (i % 2 ? -14 : 12);
    const w = img.aspect >= 1 ? size : size * img.aspect;
    const h = img.aspect >= 1 ? size / img.aspect : size;
    return (
      <Placed
        key={i}
        box={{ left: W * x - w / 2, top: H * y - h / 2, width: w, height: h }}
        t={o[`prop${i}`]}
        style={{ opacity: pIn, translate: `0 ${bob + (1 - pIn) * 60}px`, rotate: `${spin}deg`, scale: `${0.7 + 0.3 * pIn}` }}
      >
        <Img
          src={img.src}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            filter: `blur(${blur}px) drop-shadow(0 ${size * 0.06}px ${size * 0.1}px #000000${alpha(0.35)})`,
          }}
        />
      </Placed>
    );
  };

  return (
    <AbsoluteFill style={{ background: bg, overflow: "hidden", direction: "rtl" }}>
      {/* Studio sweep: a lit wall in the brand colour and a darker floor. */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at ${wide ? (subjectSide === "left" ? "30%" : "70%") : "50%"} 38%, #ffffff${alpha(0.32)} 0%, transparent 55%), linear-gradient(180deg, ${bg} 0%, ${bg} 62%, #000000${alpha(0.35)} 100%)`,
        }}
      />
      {spots.map((_, i) => prop(i, false))}

      <Placed
        box={markBox}
        t={o.wordmark}
        style={{ display: "flex", flexDirection: "column", alignItems: wide ? "flex-end" : "center", direction: "ltr", opacity: markIn, translate: `0 ${(1 - markIn) * -40}px` }}
      >
        {copy.wordmark.map((line, i) => (
          <div
            key={i}
            style={{
              fontFamily: display,
              fontWeight: 900,
              fontSize: markSize,
              lineHeight: 0.92,
              color: i === copy.wordmark.length - 1 && copy.wordmark.length > 1 ? accent : ink,
              textTransform: "uppercase",
              whiteSpace: "nowrap",
              textShadow: `0 ${markSize * 0.04}px 0 #000000${alpha(0.25)}, 0 ${markSize * 0.1}px ${markSize * 0.3}px #000000${alpha(0.35)}`,
            }}
          >
            {line}
          </div>
        ))}
        {copy.tags.length > 0 && (
          <div style={{ display: "flex", gap: markSize * 0.12, marginTop: markSize * 0.18, direction: "rtl" }}>
            {copy.tags.map((t) => (
              <Pill key={t} text={t} font={body} size={markSize * 0.2} color="#e23b3b" ink="#ffffff" />
            ))}
          </div>
        )}
      </Placed>

      {assets.subject && (
        <Hero src={assets.subject.src} box={heroBox} t={o.subject} bg={bg} accent="#ffffff" lightFrom={lightFrom} progress={heroIn} shadow={0.35} />
      )}

      <Placed
        box={subBox}
        t={o.subtitle}
        style={{ display: "flex", alignItems: "flex-end", justifyContent: wide ? "flex-start" : "center", opacity: subIn }}
      >
        <div
          style={{
            fontFamily: body,
            fontWeight: 800,
            fontSize: subSize,
            lineHeight: 1.2,
            color: inkOn(accent),
            background: accent,
            padding: `${subSize * 0.3}px ${subSize * 0.7}px`,
            borderRadius: subSize * 0.5,
            boxShadow: `0 ${subSize * 0.3}px ${subSize}px #000000${alpha(0.3)}`,
            textAlign: wide ? "right" : "center",
            textWrap: "balance",
          }}
        >
          {copy.subtitle}
        </div>
      </Placed>

      {spots.map((_, i) => prop(i, true))}
      <Grain opacity={0.08} />
    </AbsoluteFill>
  );
};
