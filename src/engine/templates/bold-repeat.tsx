// "Bold repeat": the brand name repeated in huge condensed rows that drift across a saturated
// ground, the lecturer big in front, a sticker with the promise slapped on top. Loud and pop:
// creators, fitness, music, sales, events, young audiences.
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { DesignProps } from "../design";
import { balancedLines, fitLines } from "../fit";
import { fontFamily, type FontName } from "../fonts";
import { formatFromSize, STORY_SAFE } from "../formats";
import { alpha, Grain } from "../fx";
import { Hero, inkOn, isLightBg, Logo, Pill, Placed, useEnter, type Box } from "../parts";

export const BoldRepeat: React.FC<DesignProps> = ({ brand, copy, assets, subjectSide, overrides: o }) => {
  const frame = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const enter = useEnter();
  const format = formatFromSize(W, H);
  const wide = format === "landscape";
  const story = format === "story";
  const tall = format === "portrait" || story;
  const { bg, ink, accent } = brand.palette;
  const light = isLightBg(bg);
  const display = fontFamily(brand.displayFont as FontName);
  const body = fontFamily(brand.bodyFont as FontName);
  const head = fontFamily(brand.headlineFont as FontName);
  const ar = assets.subject?.aspect ?? 0.62;
  const short = Math.min(W, H);

  const word = copy.wordmark.join(" ").toUpperCase();
  // Rows of the name fill the frame; the one at eye level is solid and readable, the rest outlined.
  const rowSize = Math.min(fitLines([word], W * 0.92, display, { uppercase: true }), H * (wide ? 0.24 : tall ? 0.13 : 0.2));
  const rowH = rowSize * 0.92;
  const rows = Math.ceil(H / rowH) + 1;
  const safeTop = story ? H * STORY_SAFE.top : H * 0.05;
  const safeBottom = story ? H * (1 - STORY_SAFE.bottom) : H * 0.95;
  const repeated = Array.from({ length: 4 }, () => word).join("  •  ");
  const kickerBox: Box = { left: W * 0.06, top: safeTop + (story ? H * 0.01 : 0), width: W * 0.88, height: short * 0.12 };
  // The solid, readable row is the first one clear of the pills; the lecturer's head starts just
  // under it (tucked by a sliver for depth), so the name is never hidden behind the face.
  const rowTop = (i: number) => i * rowH - rowH * 0.12;
  let heroRow = 0;
  while (rowTop(heroRow) < kickerBox.top + short * 0.07) heroRow++;
  const nameBottom = rowTop(heroRow) + rowSize * 0.95;

  // The lecturer: big and central, slightly toward their side in the wide format.
  // Wide and square crop the lecturer at the chest (past the bottom edge), so they stay big.
  const floor = tall ? safeBottom + H * 0.04 : H * 1.14;
  const heroH = Math.min(H * (wide ? 0.92 : tall ? 0.62 : 0.78), (W * (wide ? 0.5 : 0.86)) / ar, floor - (nameBottom - rowSize * 0.12));
  const heroW = heroH * ar;
  const heroLeft = wide ? (subjectSide === "left" ? W * 0.3 - heroW / 2 : W * 0.7 - heroW / 2) : (W - heroW) / 2;
  const heroBox: Box = { left: heroLeft, top: floor - heroH, width: heroW, height: heroH };

  // The sticker with the promise: in front of the lecturer's chest, on the far side in wide.
  // Two balanced lines, as large as the sticker allows (never a column of one-word lines).
  const stickerW = W * (wide ? 0.4 : tall ? 0.84 : 0.66);
  const subLines = balancedLines(copy.subtitle);
  const subCap = Math.round((wide ? H : W) * (wide ? 0.05 : tall ? 0.055 : 0.052));
  const subSize = Math.min(subCap, fitLines(subLines, stickerW - subCap * 1.9, head) * 0.95);
  const stickerBox: Box = wide
    ? { left: subjectSide === "left" ? W * 0.58 : W * 0.06, top: H * 0.56, width: stickerW, height: H * 0.34 }
    : { left: (W - stickerW) / 2, top: safeBottom - subSize * 5.4, width: stickerW, height: subSize * 5.4 };

  const rowsIn = enter(0, 24);
  const heroIn = enter(8);
  const stickIn = enter(20, 20);
  const kickIn = enter(14);
  const halftone = `radial-gradient(${inkOn(bg)}${alpha(light ? 0.08 : 0.07)} ${short * 0.0025}px, transparent ${short * 0.003}px)`;

  return (
    <AbsoluteFill style={{ background: bg, overflow: "hidden", direction: "rtl" }}>
      <AbsoluteFill style={{ backgroundImage: halftone, backgroundSize: `${short * 0.014}px ${short * 0.014}px` }} />
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 45%, ${accent}${alpha(0.28)} 0%, transparent 60%)` }} />

      {/* The drifting rows of the brand name. */}
      <Placed box={{ left: 0, top: 0, width: W, height: H }} el="wordmark" t={o.wordmark} style={{ direction: "ltr", opacity: rowsIn }}>
        {Array.from({ length: rows }, (_, i) => {
          const solid = i === heroRow;
          const dir = i % 2 ? 1 : -1;
          const x = interpolate(frame, [0, 300], [0, dir * W * 0.12]) - W * 0.6 + (i % 3) * W * 0.17;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                top: rowTop(i),
                left: solid ? 0 : x,
                width: solid ? W : undefined,
                textAlign: solid ? "center" : undefined,
                fontFamily: display,
                fontWeight: 900,
                fontSize: rowSize,
                lineHeight: 1,
                whiteSpace: "nowrap",
                textTransform: "uppercase",
                color: solid ? ink : "transparent",
                WebkitTextStroke: solid ? undefined : `${Math.max(2, rowSize * 0.012)}px ${ink}${alpha(0.28)}`,
                textShadow: solid ? `0 ${rowSize * 0.04}px ${rowSize * 0.12}px #000000${alpha(light ? 0.12 : 0.35)}` : undefined,
              }}
            >
              {solid ? word : repeated}
            </div>
          );
        })}
      </Placed>

      {assets.subject && <Hero src={assets.subject.src} box={heroBox} t={o.subject} bg={bg} accent={accent} lightFrom={subjectSide === "left" ? "right" : "left"} progress={heroIn} shadow={0.25} />}

      {/* Kicker and tags up top, as pills. */}
      <Placed box={kickerBox} el="tags" t={o.tags} style={{ display: "flex", gap: short * 0.015, justifyContent: "center", alignItems: "flex-start", flexWrap: "wrap", opacity: kickIn }}>
        <Logo logo={assets.logo} height={short * 0.05} maxWidth={W * 0.3} bg={bg} t={o.logo} style={{ alignSelf: "center" }} />
        {[copy.kicker, ...copy.tags].filter(Boolean).map((t, i) => (
          <Pill key={t} text={t} font={body} size={short * 0.03} color={i === 0 ? ink : accent} ink={inkOn(i === 0 ? ink : accent)} />
        ))}
      </Placed>

      {/* The sticker: a tilted card with the promise, slapped on with a bounce. */}
      <Placed
        box={stickerBox}
        el="subtitle"
        t={o.subtitle}
        style={{ display: "flex", alignItems: wide ? "center" : "flex-end", justifyContent: "center", scale: `${interpolate(stickIn, [0, 1], [1.4, 1])}`, opacity: stickIn }}
      >
        <div
          style={{
            background: accent,
            color: inkOn(accent),
            fontFamily: head,
            fontWeight: 900,
            fontSize: subSize,
            lineHeight: 1.15,
            padding: `${subSize * 0.55}px ${subSize * 0.9}px`,
            borderRadius: subSize * 0.35,
            rotate: subjectSide === "left" ? "-3deg" : "3deg",
            textAlign: "center",
            boxShadow: `${subSize * 0.18}px ${subSize * 0.22}px 0 ${ink}, 0 ${subSize * 0.5}px ${subSize * 1.2}px #000000${alpha(0.3)}`,
            maxWidth: stickerW,
          }}
        >
          {subLines.map((l, i) => (
            <div key={i} style={{ whiteSpace: "nowrap" }}>
              {l}
            </div>
          ))}
        </div>
      </Placed>

      <Grain opacity={0.09} />
    </AbsoluteFill>
  );
};
