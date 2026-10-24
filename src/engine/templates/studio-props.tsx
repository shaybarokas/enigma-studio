// "Studio with props": a bright studio backdrop, the lecturer, and 3D objects from the course's world
// floating around them with depth of field. Derived from SWING & WIN, PREDICT & PROFIT, LOAN LOGIC.
import { AbsoluteFill, Img, useCurrentFrame, useVideoConfig } from "remotion";
import type { DesignProps } from "../design";
import { fontFamily, type FontName } from "../fonts";
import { formatFromSize, STORY_SAFE } from "../formats";
import { alpha, Grain } from "../fx";
import { balancedLines, fitLines } from "../fit";
import { Hero, inkOn, Logo, logoSpace, Pill, Placed, useEnter, type Box } from "../parts";

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
  // No photo: the kit's AI scene becomes the studio, and the wordmark, tags and promise stand as one
  // centred block in it (the layout otherwise keeps a side or the bottom free for the lecturer).
  const solo = !assets.subject;

  const markBox: Box = solo
    ? { left: W * 0.08, top: 0, width: W * 0.84, height: H * 0.5 }
    : wide
    ? {
        left: subjectSide === "left" ? W * (format === "landscape" ? 0.47 : 0.53) : W * 0.05,
        top: H * 0.08,
        width: W * (format === "landscape" ? 0.48 : 0.42),
        height: H * 0.5,
      }
    : { left: W * 0.06, top: story ? H * (STORY_SAFE.top + 0.01) : H * 0.05, width: W * 0.88, height: H * 0.26 };
  // A wide (head-and-shoulders) photo stands short in tall formats: the wordmark gives it more room.
  const markSize = Math.min(fitLines(copy.wordmark, markBox.width, display, { uppercase: true }), solo ? (wide ? H * 0.26 : W * 0.24) : wide ? H * 0.22 : W * (ar > 0.8 ? 0.17 : 0.26));

  // Height from the format, capped by width so a wide photo never swallows the wordmark.
  let heroH = Math.min(wide ? H * 0.95 : H * (story ? 0.58 : 0.62), (W * (format === "landscape" ? 0.42 : wide ? 0.46 : 0.8)) / ar);
  // Where the wordmark and its tags really end (pills included), not the box they may use.
  // The tags stay on one row: smaller when long, so a third tag never wraps onto the promise.
  const tagChars = copy.tags.join("").length;
  const tagSize = copy.tags.length ? Math.min(markSize * 0.2, (markBox.width * 0.92) / (tagChars * 0.55 + copy.tags.length * 2.2)) : 0;
  const tagsH = copy.tags.length ? markSize * 0.18 + tagSize * 2.1 : 0;
  const logoH = markSize * 0.5;
  const logoRoom = logoSpace(assets.logo, logoH, markBox.width * 0.5);
  const markText: Box = { ...markBox, height: logoRoom + copy.wordmark.length * markSize * 0.92 + tagsH };
  // Tall formats stack the wordmark above the hero: the head starts below its real height, so a long
  // name or a row of tags never ends up behind the face.
  if (!wide) heroH = Math.min(heroH, H - (markText.top + markText.height + short * 0.015));

  // The promise as a chip of two balanced lines, sized to its column, with its real height: wide
  // formats set it right under the wordmark and tags, tall ones at the bottom of the safe area.
  const subW = solo ? W * 0.84 : wide ? markBox.width : W * 0.88;
  const subLines = balancedLines(copy.subtitle);
  const subSize = Math.min(Math.round((wide ? H : W) * (format === "landscape" ? 0.048 : 0.058)), fitLines(subLines, subW * 0.86, body) * 0.95);
  const subH = subSize * 1.2 * subLines.length + subSize * 0.6;
  const subBottom = wide ? Math.min(H * 0.94, markText.top + markText.height + markSize * 0.3 + subH) : H * (story ? 1 - STORY_SAFE.bottom - 0.01 : 0.95);
  let subBox: Box = { left: wide ? markBox.left : W * 0.06, top: subBottom - subH, width: subW, height: subH };
  // Tall: a short (wide-cropped) hero stands low, and the face would meet the chip at the bottom. Then
  // the chip joins the wordmark at the top and the hero stands below them both.
  if (solo) {
    const block = markText.height + markSize * 0.3 + subH;
    const safeTop = story ? H * (STORY_SAFE.top + 0.01) : H * 0.06;
    const top = Math.max(safeTop, (H - block) / 2);
    markBox.top = markText.top = top;
    subBox = { left: W * 0.08, top: top + markText.height + markSize * 0.3, width: subW, height: subH };
  } else if (!wide && H - heroH + heroH * 0.45 > subBox.top - short * 0.02) {
    subBox = { ...subBox, top: markText.top + markText.height + markSize * 0.25 };
    heroH = Math.min(heroH, H - (subBox.top + subH + short * 0.02));
  }
  const heroBox: Box = wide
    ? {
        left: subjectSide === "left" ? W * (format === "landscape" ? 0.12 : 0.02) : W - W * (format === "landscape" ? 0.1 : 0.02) - heroH * ar,
        top: H - heroH,
        width: heroH * ar,
        height: heroH,
      }
    : { left: (W - heroH * ar) / 2, top: H - heroH, width: heroH * ar, height: heroH };

  const heroIn = enter(8);
  const markIn = enter(2);
  const subIn = enter(20);
  const spots = SPOTS[wide ? "wide" : "tall"];

  const prop = (i: number, front: boolean) => {
    const img = assets.props[i % Math.max(assets.props.length, 1)];
    const spot = spots.at(i);
    if (!img || !spot) return null;
    const [x, y0, s0, blur, depth] = spot;
    // In the square the hero is small, so near (front) props shrink and sink to the bottom edge.
    const near = depth > 1;
    const s = format === "square" && near ? s0 * 0.6 : s0;
    const y = format === "square" && near ? Math.max(y0, 0.9) : y0;
    if (front !== depth > 1) return null;
    const size = short * s;
    const pIn = enter(4 + i * 4, 24);
    const bob = Math.sin((frame / fps) * 1.6 + i * 1.3) * size * 0.04 * depth;
    const spin = Math.sin((frame / fps) * 0.8 + i) * 6 + (i % 2 ? -14 : 12);
    const w = img.aspect >= 1 ? size : size * img.aspect;
    const h = img.aspect >= 1 ? size / img.aspect : size;
    // Near props pass in front of everything, so they keep off the text: a prop that would cover the
    // promise or the wordmark slides out past that box's nearer edge, barely touching it.
    let top = H * y - h / 2;
    if (near) {
      for (const b of [subBox, markText]) {
        const left = W * x - w / 2;
        const hits = left < b.left + b.width && left + w > b.left && top < b.top + b.height && top + h > b.top;
        if (!hits) continue;
        top = top + h / 2 > b.top + b.height / 2 ? Math.max(top, b.top + b.height - h * 0.06) : Math.min(top, b.top - h * 0.94);
      }
    }
    return (
      <Placed
        key={i}
        box={{ left: W * x - w / 2, top, width: w, height: h }}
        el={`prop${i}`}
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
      {solo && assets.background && (
        <AbsoluteFill>
          <Img src={assets.background} style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.7 }} />
          <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 50%, ${bg}${alpha(0.75)} 0%, ${bg}${alpha(0.35)} 60%, ${bg}${alpha(0.6)} 100%)` }} />
        </AbsoluteFill>
      )}
      {spots.map((_, i) => prop(i, false))}

      <Placed
        box={markBox}
        el="wordmark" t={o.wordmark}
        style={{ display: "flex", flexDirection: "column", alignItems: wide && !solo ? "flex-end" : "center", direction: "ltr", opacity: markIn, translate: `0 ${(1 - markIn) * -40}px` }}
      >
        <Logo logo={assets.logo} height={logoH} maxWidth={markBox.width * 0.5} bg={bg} t={o.logo} style={{ marginBottom: logoH * 0.4 }} />
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
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: wide && !solo ? "flex-start" : "center", gap: markSize * 0.12, marginTop: markSize * 0.18, direction: "rtl", maxWidth: markBox.width }}>
            {copy.tags.map((t) => (
              <Pill key={t} text={t} font={body} size={tagSize} color={ink} ink={bg} />
            ))}
          </div>
        )}
      </Placed>

      {assets.subject && (
        <Hero src={assets.subject.src} box={heroBox} t={o.subject} bg={bg} accent="#ffffff" lightFrom={lightFrom} progress={heroIn} shadow={0.35} />
      )}

      <Placed
        box={subBox}
        el="subtitle" t={o.subtitle}
        style={{ display: "flex", alignItems: "flex-start", justifyContent: wide && !solo ? "flex-start" : "center", opacity: subIn }}
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
            textAlign: wide && !solo ? "right" : "center",
          }}
        >
          {subLines.map((l, i) => (
            <div key={i} style={{ whiteSpace: "nowrap" }}>
              {l}
            </div>
          ))}
        </div>
      </Placed>

      {spots.map((_, i) => prop(i, true))}
      <Grain opacity={0.08} />
    </AbsoluteFill>
  );
};
