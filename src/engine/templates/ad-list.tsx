// Marketing ad "what's inside": a headline and the course's outcomes as glass cards that land one by
// one, the lecturer beside them, price and call to action.
import { fitText } from "@remotion/layout-utils";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { splitHeadline, type DesignProps } from "../design";
import { fontFamily, type FontName } from "../fonts";
import { formatFromSize, STORY_SAFE } from "../formats";
import { alpha, Glow, Grain, Vignette } from "../fx";
import { CtaButton, Hero, inkOn, isLightBg, Logo, logoSpace, Placed, Scene, useEnter, type Box } from "../parts";

const Check: React.FC<{ size: number; color: string; ink: string }> = ({ size, color, ink }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ flex: "none" }}>
    <circle cx="12" cy="12" r="12" fill={color} />
    <path d="M6.5 12.5l3.5 3.5 7.5-8" fill="none" stroke={ink} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const AdList: React.FC<DesignProps> = ({ brand, copy, assets, subjectSide, overrides: o }) => {
  const { width: W, height: H } = useVideoConfig();
  const enter = useEnter();
  const format = formatFromSize(W, H);
  const landscape = format === "landscape";
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

  // The list column sits on the side away from the hero, who stands half out of frame behind it.
  const colW = W * (landscape ? 0.54 : 0.68);
  const colLeft = subjectSide === "left" ? W - W * 0.05 - colW : W * 0.05;
  const headBox: Box = { left: landscape ? colLeft : W * 0.06, top: safeTop + H * 0.02, width: landscape ? colW : W * 0.88, height: H * 0.22 };
  const fit = (t: string) => (t ? fitText({ text: t, withinWidth: headBox.width, fontFamily: head, fontWeight: 900 }).fontSize : Infinity);
  // Landscape: one line. Tall: the two parts stacked, each as large as it fits.
  const stacked = !landscape && h2 !== "";
  const hSize = stacked ? Math.min(fit(h1), fit(h2), W * 0.12) : Math.min(fit(`${h1} ${h2}`.trim()), landscape ? H * 0.1 : W * 0.1);

  // The brand's logo opens the head (the call-to-action row has no room for it beside the price).
  const logoH = hSize * 0.6;
  const logoRoom = logoSpace(assets.logo, logoH, headBox.width * 0.4);
  const listTop = headBox.top + logoRoom + hSize * (stacked ? 2.5 : 1.5);
  const ctaSize = Math.round((landscape ? H : W) * (story ? 0.05 : 0.042));
  // Tall formats stack the price over the button (side by side they overflow the narrow column).
  const ctaH = ctaSize * (landscape ? 3 : copy.price ? 4.4 : 3);
  const listBox: Box = { left: colLeft, top: listTop, width: colW, height: safeBottom - listTop - ctaH - ctaSize * 0.4 };
  const itemSize = Math.round(
    Math.min((landscape ? H : W) * (landscape ? 0.038 : story ? 0.048 : 0.042), (listBox.height / Math.max(bullets.length, 1)) * 0.32),
  );

  const heroH = Math.min(landscape ? H * 0.94 : H * 0.58, (W * (landscape ? 0.4 : 0.46)) / ar);
  const heroW = heroH * ar;
  const heroBox: Box = {
    left: subjectSide === "left" ? -heroW * (landscape ? 0.12 : 0.22) : W - heroW * (landscape ? 0.88 : 0.78),
    top: H - heroH,
    width: heroW,
    height: heroH,
  };
  const ctaBox: Box = { left: colLeft, top: safeBottom - ctaH, width: colW, height: ctaH };

  const headIn = enter(2);
  const heroIn = enter(8);
  const ctaIn = enter(16 + bullets.length * 6);

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

      <Placed box={headBox} el="headline" t={o.headline} style={{ opacity: headIn, translate: `0 ${(1 - headIn) * 30}px`, textAlign: landscape ? "right" : "center", display: "flex", flexDirection: "column", justifyContent: "flex-start", alignItems: landscape ? "flex-start" : "center" }}>
        <Logo logo={assets.logo} height={logoH} maxWidth={headBox.width * 0.4} bg={bg} t={o.logo} style={{ marginBottom: logoH * 0.4 }} />
        {stacked ? (
          <>
            <div style={{ fontFamily: head, fontWeight: 900, fontSize: hSize, lineHeight: 1.1, color: ink, whiteSpace: "nowrap" }}>{h1}</div>
            <div style={{ fontFamily: head, fontWeight: 900, fontSize: hSize, lineHeight: 1.1, color: accent, whiteSpace: "nowrap" }}>{h2}</div>
          </>
        ) : (
          <div style={{ fontFamily: head, fontWeight: 900, fontSize: hSize, lineHeight: 1.05, color: ink, whiteSpace: "nowrap" }}>
            {h1} {h2 && <span style={{ color: accent }}>{h2}</span>}
          </div>
        )}
      </Placed>

      <Placed box={listBox} el="bullets" t={o.bullets} style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: itemSize * 0.55 }}>
        {bullets.map((b, i) => {
          const p = enter(12 + i * 6, 22);
          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: itemSize * 0.6,
                padding: `${itemSize * 0.55}px ${itemSize * 0.75}px`,
                borderRadius: itemSize * 0.6,
                background: `linear-gradient(135deg, #ffffff${alpha(0.14)}, #ffffff${alpha(0.04)})`,
                border: `1px solid #ffffff${alpha(0.18)}`,
                boxShadow: `0 ${itemSize * 0.3}px ${itemSize}px #000000${alpha(0.3)}, inset 0 1px 0 #ffffff${alpha(0.2)}`,
                backdropFilter: "blur(14px)",
                opacity: p,
                translate: `${(1 - p) * (subjectSide === "left" ? 80 : -80)}px 0`,
              }}
            >
              <Check size={itemSize * 1.15} color={accent} ink={inkOn(accent)} />
              <div style={{ fontFamily: body, fontWeight: 700, fontSize: itemSize, lineHeight: 1.25, color: ink }}>{b}</div>
            </div>
          );
        })}
      </Placed>

      <Placed
        box={ctaBox}
        el="cta"
        t={o.cta}
        style={{ display: "flex", flexDirection: landscape ? "row" : "column-reverse", alignItems: "center", justifyContent: landscape ? "space-between" : "flex-start", gap: ctaSize * (landscape ? 0.6 : 0.25) }}
      >
        <CtaButton text={copy.cta} font={body} size={ctaSize} color={accent} ink={inkOn(accent)} progress={ctaIn} />
        {copy.price && (
          <div style={{ fontFamily: head, fontWeight: 900, fontSize: ctaSize * (landscape ? 1.7 : 1.35), color: ink, opacity: ctaIn, whiteSpace: "nowrap", textShadow: `0 4px 20px #000000${alpha(0.6)}` }}>
            {copy.price}
          </div>
        )}
      </Placed>

      <Vignette strength={0.4} />
      <Grain opacity={0.1} />
    </AbsoluteFill>
  );
};
