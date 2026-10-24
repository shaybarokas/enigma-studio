// Marketing ad "what's inside": a headline and the course's outcomes as glass cards that land one by
// one, each with its icon, the lecturer beside them, price and call to action.
// Wide and square: the list and the offer stand in a column away from the lecturer, who is half out
// of frame on the other side. Tall (3:4, story): head and list span the full width, and the lecturer
// and the offer share the bottom, side by side.
import { AbsoluteFill, useVideoConfig } from "remotion";
import { splitHeadline, type DesignProps } from "../design";
import { balancedLines, fitLines } from "../fit";
import { fontFamily, type FontName } from "../fonts";
import { formatFromSize, STORY_SAFE } from "../formats";
import { alpha, Glow, Grain, Vignette } from "../fx";
import { ItemIcon } from "../icons";
import { CtaButton, Hero, inkOn, isLightBg, Logo, logoSpace, Placed, Scene, useEnter, type Box } from "../parts";
import { splitPrice } from "../price";

export const AdList: React.FC<DesignProps> = ({ brand, copy, assets, subjectSide, overrides: o }) => {
  const { width: W, height: H } = useVideoConfig();
  const enter = useEnter();
  const format = formatFromSize(W, H);
  const landscape = format === "landscape";
  const tall = format === "portrait" || format === "story";
  const story = format === "story";
  const { bg, ink, accent } = brand.palette;
  const light = isLightBg(bg);
  const head = fontFamily(brand.headlineFont as FontName);
  const body = fontFamily(brand.bodyFont as FontName);
  const ar = assets.subject?.aspect ?? 0.62;
  const [h1, h2] = splitHeadline(copy.headline);
  const lightFrom = subjectSide === "left" ? "right" : "left";
  const bullets = copy.bullets.slice(0, landscape ? 4 : 5);
  const safeTop = story ? H * STORY_SAFE.top : H * 0.05;
  const safeBottom = story ? H * (1 - STORY_SAFE.bottom) : H * 0.95;
  const awayLeft = subjectSide === "left"; // the text column sits on the right when the lecturer is on the left

  // The column for the list and the offer; the head spans the full width in tall formats. Without a
  // photo nothing needs the side or the corner: the column is centred and wider, the items larger.
  const solo = !assets.subject;
  const colW = W * (solo ? (landscape ? 0.64 : 0.88) : landscape ? 0.54 : tall ? 0.88 : 0.6);
  const colLeft = solo ? (W - colW) / 2 : tall ? W * 0.06 : awayLeft ? W - W * 0.05 - colW : W * 0.05;
  const headW = tall ? W * 0.88 : colW;
  const headLeft = tall ? W * 0.06 : colLeft;

  // Head: the brand's logo, then the headline, each part as large as fits.
  const stacked = !landscape && h2 !== "";
  const lines = stacked ? [h1, h2] : [`${h1} ${h2}`.trim()];
  const hCap = landscape ? H * 0.1 : tall ? W * 0.115 : W * 0.085;
  const hSize = Math.min(fitLines(lines, headW, head) * 0.97, hCap);
  const logoH = hSize * 0.6;
  const logoRoom = logoSpace(assets.logo, logoH, headW * 0.4);
  const headBox: Box = { left: headLeft, top: safeTop + H * 0.015, width: headW, height: logoRoom + hSize * 1.12 * lines.length };

  // The offer: the price split (amount big, the rest small) and the button.
  const price = copy.price ? (splitPrice(copy.price) ?? { number: copy.price, rest: "" }) : null;
  const ctaSize = Math.round(W * (landscape ? 0.022 : story ? 0.05 : 0.044));
  const offerW = tall ? W * 0.52 : colW;
  const amount = price ? Math.min(ctaSize * 1.9, fitLines([price.number], offerW * 0.95, head)) : 0;
  const restSize = ctaSize * 0.62;
  const restLines = price?.rest ? Math.ceil((price.rest.length * restSize * 0.5) / (offerW * 0.95)) : 0;
  const offerH = ctaSize * 2.6 + (price ? amount * 1.1 + restLines * restSize * 1.3 + ctaSize * 0.4 : 0);

  // Lecturer: half out of frame beside the column (wide, square), or in the bottom corner (tall).
  const heroH = landscape ? Math.min(H * 0.94, (W * 0.4) / ar) : tall ? Math.min(H * (story ? 0.38 : 0.42), (W * 0.5) / ar) : Math.min(H * 0.62, (W * 0.46) / ar);
  const heroW = heroH * ar;
  const heroBox: Box = {
    left: awayLeft ? -heroW * (landscape ? 0.12 : tall ? 0.04 : 0.22) : W - heroW * (landscape ? 0.88 : tall ? 0.96 : 0.78),
    top: H - heroH,
    width: heroW,
    height: heroH,
  };

  const offerBox: Box = tall
    ? { left: solo ? (W - offerW) / 2 : awayLeft ? W - W * 0.04 - offerW : W * 0.04, top: safeBottom - offerH, width: offerW, height: offerH }
    : { left: colLeft, top: safeBottom - offerH, width: colW, height: offerH };

  // List: between the head and whatever is below it.
  const listTop = headBox.top + headBox.height + H * (tall ? 0.03 : 0.025);
  // Tall: the list ends above both the lecturer's head and the offer.
  const listBottom = (tall && !solo ? Math.min(offerBox.top, H - heroH * 0.92) : offerBox.top) - H * 0.025;
  const listBox: Box = { left: colLeft, top: listTop, width: colW, height: Math.max(H * 0.15, listBottom - listTop) };
  const cap = landscape ? H * 0.04 : W * (story ? 0.05 : 0.044);
  const icon = (sz: number) => sz * 1.5;
  const textW = (sz: number) => colW - icon(sz) - sz * 2.4;
  // One line per item while that stays large; otherwise long items wrap to two balanced lines.
  const sizeWith = (rows: string[][]) => {
    let sz = cap;
    for (let k = 0; k < 2; k++) sz = Math.min(cap, ...rows.map((r) => fitLines(r, textW(sz), body) * 0.94));
    return sz;
  };
  const single = bullets.map((b) => [b]);
  const wrapped = bullets.map((b) => (b.length > 14 ? balancedLines(b) : [b]));
  const sizeSingle = sizeWith(single);
  const rows = sizeSingle >= cap * 0.85 ? single : wrapped;
  // …and all of them fit the list's height.
  const gapK = 0.5;
  const heightAt = (sz: number) => rows.reduce((a, r) => a + r.length * sz * 1.2 + sz * 1.0, 0) + gapK * sz * (rows.length - 1);
  let itemSize = rows === single ? sizeSingle : sizeWith(wrapped);
  itemSize = Math.min(itemSize, (itemSize * listBox.height) / heightAt(itemSize));

  const headIn = enter(2);
  const heroIn = enter(8);
  const ctaIn = enter(16 + bullets.length * 6);
  const cardBg = light ? `linear-gradient(135deg, #ffffff${alpha(0.85)}, #ffffff${alpha(0.6)})` : `linear-gradient(135deg, #ffffff${alpha(0.14)}, #ffffff${alpha(0.04)})`;

  return (
    <AbsoluteFill style={{ background: bg, overflow: "hidden", direction: "rtl" }}>
      <Scene src={!landscape && assets.backgroundTall ? assets.backgroundTall : assets.background} bg={bg} grade={0.65} blur={10} brightness={light ? 1 : 0.5} />
      {light && <AbsoluteFill style={{ background: `${bg}${alpha(0.78)}` }} />}

      {assets.subject && (
        <>
          <Glow x={heroBox.left + heroBox.width / 2} y={heroBox.top + heroBox.height * 0.3} size={heroBox.width * 1.3} color={accent} opacity={0.2 * heroIn} />
          <Hero src={assets.subject.src} box={heroBox} t={o.subject} bg={bg} accent={accent} lightFrom={lightFrom} progress={heroIn} />
        </>
      )}

      <Placed
        box={headBox}
        el="headline"
        t={o.headline}
        style={{ opacity: headIn, translate: `0 ${(1 - headIn) * 30}px`, textAlign: landscape && !solo ? "right" : "center", display: "flex", flexDirection: "column", alignItems: landscape && !solo ? "flex-start" : "center" }}
      >
        <Logo logo={assets.logo} height={logoH} maxWidth={colW * 0.4} bg={bg} t={o.logo} style={{ marginBottom: logoH * 0.4 }} />
        {lines.map((l, i) => (
          <div key={i} style={{ fontFamily: head, fontWeight: 900, fontSize: hSize, lineHeight: 1.1, color: stacked && i === 1 ? accent : ink, whiteSpace: "nowrap" }}>
            {!stacked && h2 ? (
              <>
                {h1} <span style={{ color: accent }}>{h2}</span>
              </>
            ) : (
              l
            )}
          </div>
        ))}
      </Placed>

      <Placed box={listBox} el="bullets" t={o.bullets} style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: itemSize * gapK }}>
        {rows.map((lines, i) => {
          const p = enter(12 + i * 6, 22);
          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: itemSize * 0.7,
                padding: `${itemSize * 0.5}px ${itemSize * 0.7}px`,
                minHeight: itemSize * 2.2,
                borderRadius: itemSize * 0.7,
                background: cardBg,
                border: `1px solid ${light ? `#000000${alpha(0.06)}` : `#ffffff${alpha(0.18)}`}`,
                boxShadow: `0 ${itemSize * 0.3}px ${itemSize}px #000000${alpha(light ? 0.12 : 0.3)}, inset 0 1px 0 #ffffff${alpha(0.2)}`,
                opacity: p,
                translate: `${(1 - p) * (awayLeft ? 80 : -80)}px 0`,
              }}
            >
              <ItemIcon name={copy.icons[i]} size={icon(itemSize)} color={accent} ink={inkOn(accent)} progress={p} />
              <div style={{ fontFamily: body, fontWeight: 700, fontSize: itemSize, lineHeight: 1.2, color: light ? "#16161d" : ink, whiteSpace: "nowrap" }}>
                {lines.map((l, k) => (
                  <div key={k}>{l}</div>
                ))}
              </div>
            </div>
          );
        })}
      </Placed>

      <Placed box={offerBox} el="cta" t={o.cta} style={{ display: "flex", flexDirection: "column", alignItems: landscape && !solo ? "flex-start" : "center", justifyContent: "flex-end", gap: ctaSize * 0.35 }}>
        {price && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: landscape && !solo ? "flex-start" : "center", opacity: ctaIn, textAlign: landscape && !solo ? "right" : "center" }}>
            <div style={{ fontFamily: head, fontWeight: 900, fontSize: amount, lineHeight: 1.05, color: light ? ink : "#ffffff", direction: "ltr", whiteSpace: "nowrap", textShadow: light ? "none" : `0 4px 20px #000000${alpha(0.6)}` }}>
              {price.number}
            </div>
            {price.rest && <div style={{ fontFamily: body, fontWeight: 600, fontSize: restSize, lineHeight: 1.3, color: ink, opacity: 0.85, maxWidth: offerW * 0.95, textWrap: "balance" }}>{price.rest}</div>}
          </div>
        )}
        <CtaButton text={copy.cta} font={body} size={ctaSize} color={accent} ink={inkOn(accent)} progress={ctaIn} />
      </Placed>

      <Vignette strength={light ? 0.2 : 0.4} />
      <Grain opacity={0.1} />
    </AbsoluteFill>
  );
};
