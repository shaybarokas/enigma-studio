// "Split editorial": a magazine cover cut in two. One panel is the lecturer in their world, the
// other a solid brand panel with a masthead (the wordmark between fine rules) and a big Hebrew
// headline. Confident and modern: business, consulting, marketing, tech, education.
import { AbsoluteFill, interpolate, useVideoConfig } from "remotion";
import { splitHeadline, type DesignProps } from "../design";
import { fitLines } from "../fit";
import { fontFamily, type FontName } from "../fonts";
import { formatFromSize, STORY_SAFE, type FormatId } from "../formats";
import { alpha, Grain } from "../fx";
import {
  Hero,
  inkOn,
  isLightBg,
  Pill,
  Placed,
  Scene,
  useEnter,
  type Box,
} from "../parts";

type Layout = { photo: Box; panel: Box; content: Box; vertical: boolean };

// Wide: photo panel on the lecturer's side, full height. Tall: photo on top, brand panel below.
// Tall: the text panel is sized to its content first (textNeeded); the photo takes the rest.
function layoutFor(
  format: FormatId,
  W: number,
  H: number,
  side: "left" | "right",
  textNeeded = 0,
): Layout {
  if (format === "landscape" || format === "square") {
    const photoW = W * (format === "landscape" ? 0.46 : 0.48);
    const photo = {
      left: side === "left" ? 0 : W - photoW,
      top: 0,
      width: photoW,
      height: H,
    };
    const panel = {
      left: side === "left" ? photoW : 0,
      top: 0,
      width: W - photoW,
      height: H,
    };
    const pad = W * (format === "landscape" ? 0.045 : 0.055);
    return {
      photo,
      panel,
      content: {
        left: panel.left + pad,
        top: H * 0.08,
        width: panel.width - pad * 2,
        height: H * 0.84,
      },
      vertical: false,
    };
  }
  const story = format === "story";
  const bottom = story ? H * (1 - STORY_SAFE.bottom) : H * 0.95;
  const split = Math.min(
    H * 0.6,
    Math.max(H * 0.4, bottom - textNeeded - H * 0.03),
  );
  const photo = { left: 0, top: 0, width: W, height: split };
  const panel = { left: 0, top: split, width: W, height: H - split };
  const pad = W * 0.07;
  return {
    photo,
    panel,
    content: {
      left: pad,
      top: split + H * 0.03,
      width: W - pad * 2,
      height: bottom - split - H * 0.03,
    },
    vertical: true,
  };
}

export const SplitEditorial: React.FC<DesignProps> = ({
  brand,
  copy,
  assets,
  subjectSide,
  overrides: o,
}) => {
  const { width: W, height: H } = useVideoConfig();
  const enter = useEnter();
  const format = formatFromSize(W, H);
  const tall = format === "portrait" || format === "story";
  let L = layoutFor(format, W, H, subjectSide);
  const { bg, ink, muted, accent } = brand.palette;
  const light = isLightBg(bg);
  const display = fontFamily(brand.displayFont as FontName);
  const head = fontFamily(brand.headlineFont as FontName);
  const body = fontFamily(brand.bodyFont as FontName);
  const ar = assets.subject?.aspect ?? 0.62;
  const [h1, h2] = splitHeadline(copy.headline);
  const base = tall ? W : H;

  if (tall) {
    // Size the text at full width first, then lay out the panels around it.
    const w = W * 0.86;
    const m = Math.min(
      fitLines([copy.wordmark.join(" ")], w * 0.8, display, {
        letterSpacing: "0.08em",
        uppercase: true,
      }),
      base * 0.05,
    );
    const sub = Math.round(base * 0.042);
    const f = fitLines([h1, h2].filter(Boolean), w, head);
    const hs = Math.max(base * 0.085, Math.min(f, base * 0.12));
    const ln = (h2 ? 2 : 1) * (f < base * 0.085 ? 2 : 1);
    L = layoutFor(
      format,
      W,
      H,
      subjectSide,
      m * 2.6 +
        sub * 1.35 * 2 +
        (copy.tags.length ? sub * 0.7 * 3 : 0) +
        hs * (ln * 1.04 + 0.7),
    );
  }
  const mastSize = Math.min(
    fitLines([copy.wordmark.join(" ")], L.content.width * 0.8, display, {
      letterSpacing: "0.08em",
      uppercase: true,
    }),
    base * 0.05,
  );
  const subSize = Math.round(base * (tall ? 0.042 : 0.04));
  const tagSize = Math.round(subSize * 0.7);
  // The headline is as big as its longest part allows on one line; a long hook wraps instead of
  // shrinking below a readable size.
  const minHead = base * (tall ? 0.085 : format === "square" ? 0.062 : 0.075);
  const fitted = fitLines([h1, h2].filter(Boolean), L.content.width, head);
  const wraps = fitted < minHead;
  // Masthead, promise (two lines) and tags take their share of the panel; the headline gets the
  // rest, so nothing is pushed out at the bottom.
  const lines = (h2 ? 2 : 1) * (wraps ? 2 : 1);
  const rest =
    mastSize * 2.6 + subSize * 1.35 * 2 + (copy.tags.length ? tagSize * 3 : 0);
  const headSize = Math.min(
    Math.max(minHead, Math.min(fitted, base * (tall ? 0.13 : 0.12))),
    (L.content.height - rest) / (lines * 1.04 + 0.7),
  );

  // The lecturer stands in the photo panel, cropped at the chest, head in the upper third.
  const heroH = Math.min(
    L.photo.height * (L.vertical ? 1.02 : 0.94),
    (L.photo.width * 0.98) / ar,
  );
  const heroW = heroH * ar;
  const heroBox: Box = L.vertical
    ? {
        left: (W - heroW) / 2,
        top: L.photo.top + L.photo.height - heroH * 0.9,
        width: heroW,
        height: heroH,
      }
    : {
        left: L.photo.left + (L.photo.width - heroW) / 2,
        top: H - heroH,
        width: heroW,
        height: heroH,
      };

  const photoIn = enter(0, 26);
  const mastIn = enter(8);
  const headIn = enter(14);
  const subIn = enter(24);
  const ruleW = interpolate(mastIn, [0, 1], [0, 1]);
  const align = L.vertical ? "center" : "flex-start";

  return (
    <AbsoluteFill
      style={{ background: bg, overflow: "hidden", direction: "rtl" }}
    >
      {/* Photo panel: the scene, graded to the brand, and the lecturer clipped to it. */}
      {/* The inner layer is the full frame shifted under the panel's window, so the scene and the
          hero keep frame coordinates. Plain left/top only: AbsoluteFill's right:0 wins under RTL. */}
      <div
        style={{
          position: "absolute",
          ...L.photo,
          overflow: "hidden",
          opacity: photoIn,
        }}
      >
        <div
          style={{
            position: "absolute",
            left: -L.photo.left,
            top: -L.photo.top,
            width: W,
            height: H,
            direction: "ltr",
          }}
        >
          <Scene
            src={
              tall && assets.backgroundTall
                ? assets.backgroundTall
                : assets.background
            }
            bg={bg}
            grade={0.35}
            brightness={0.85}
          />
          {assets.subject && (
            <Hero
              src={assets.subject.src}
              box={heroBox}
              t={o.subject}
              bg={bg}
              accent={accent}
              lightFrom={subjectSide === "left" ? "right" : "left"}
              progress={enter(6)}
              shadow={0.4}
            />
          )}
        </div>
      </div>

      {/* Brand panel, with an accent seam where the two halves meet. */}
      <div style={{ position: "absolute", ...L.panel, background: bg }} />
      <div
        style={
          L.vertical
            ? {
                position: "absolute",
                left: 0,
                top: L.panel.top - W * 0.006,
                width: W * interpolate(photoIn, [0, 1], [0, 1]),
                height: W * 0.012,
                background: accent,
              }
            : {
                position: "absolute",
                left:
                  (subjectSide === "left" ? L.panel.left : L.panel.width) -
                  W * 0.004,
                top: 0,
                width: W * 0.008,
                height: H * photoIn,
                background: accent,
              }
        }
      />

      <Placed
        box={L.content}
        el="wordmark"
        t={o.wordmark}
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: L.vertical ? "flex-start" : "center",
          alignItems: align,
          textAlign: L.vertical ? "center" : "right",
        }}
      >
        {/* Masthead: the wordmark between two fine rules, like a magazine's name. */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: align,
            gap: mastSize * 0.35,
            marginBottom: headSize * 0.32,
            opacity: mastIn,
          }}
        >
          <div
            style={{
              width: L.content.width * 0.8 * ruleW,
              height: Math.max(2, mastSize * 0.05),
              background: ink,
              opacity: 0.6,
            }}
          />
          <div
            style={{
              direction: "ltr",
              fontFamily: display,
              fontWeight: 900,
              fontSize: mastSize,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: ink,
              whiteSpace: "nowrap",
              lineHeight: 1,
            }}
          >
            {copy.wordmark.join(" ")}
          </div>
          <div
            style={{
              width: L.content.width * 0.8 * ruleW,
              height: Math.max(2, mastSize * 0.05),
              background: ink,
              opacity: 0.6,
            }}
          />
        </div>
        {/* The headline block is its own element (a video's opening scene hides it under captions). */}
        <Placed
          box={{ left: 0, top: 0, width: L.content.width, height: 0 }}
          el="headline"
          t={o.headline}
          style={{
            position: "relative",
            height: "auto",
            display: "flex",
            flexDirection: "column",
            alignItems: align,
          }}
        >
          <div
            style={{
              fontFamily: head,
              fontWeight: 900,
              fontSize: headSize,
              lineHeight: 1.04,
              color: ink,
              opacity: headIn,
              translate: `0 ${(1 - headIn) * 30}px`,
              whiteSpace: wraps ? "normal" : "nowrap",
              textWrap: "balance",
            }}
          >
            {h1}
          </div>
          {h2 && (
            <div
              style={{
                fontFamily: head,
                fontWeight: 900,
                fontSize: headSize,
                lineHeight: 1.04,
                color: accent,
                opacity: headIn,
                translate: `0 ${(1 - headIn) * 30}px`,
                whiteSpace: wraps ? "normal" : "nowrap",
                textWrap: "balance",
              }}
            >
              {h2}
            </div>
          )}
          <div
            style={{
              marginTop: headSize * 0.35,
              fontFamily: body,
              fontWeight: 600,
              fontSize: subSize,
              lineHeight: 1.35,
              color: light ? ink : muted,
              opacity: subIn,
              textWrap: "balance",
              maxWidth: L.content.width,
            }}
          >
            {copy.subtitle}
          </div>
          {copy.tags.length > 0 && (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: tagSize * 0.5,
                marginTop: subSize * 0.8,
                justifyContent: L.vertical ? "center" : "flex-start",
                opacity: subIn,
              }}
            >
              {copy.tags.map((t) => (
                <Pill
                  key={t}
                  text={t}
                  font={body}
                  size={tagSize}
                  color={accent}
                  ink={inkOn(accent)}
                />
              ))}
            </div>
          )}
        </Placed>
      </Placed>

      <AbsoluteFill
        style={{
          boxShadow: `inset 0 0 ${W * 0.08}px #000000${alpha(light ? 0.06 : 0.25)}`,
          pointerEvents: "none",
        }}
      />
      <Grain opacity={light ? 0.05 : 0.09} />
    </AbsoluteFill>
  );
};
