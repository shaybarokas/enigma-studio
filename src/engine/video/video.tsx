// The video: scenes built from the kit's own templates (so the video and the graphics are one
// campaign), joined by transitions, narrated, captioned and scored.
import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { AbsoluteFill, Audio, Img, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { CalculateMetadataFunction } from "remotion";
import type { TemplateId } from "../catalog";
import type { DesignProps } from "../design";
import { fontFamily, useFontsReady, type FontName } from "../fonts";
import { alpha, Glow, Grain, Vignette } from "../fx";
import { CtaButton, Hero, inkOn, MetalText, useEnter } from "../parts";
import { TEMPLATES } from "../templates";
import { Captions } from "./captions";
import { Watermark } from "../watermark";
import { TRANSITION_FRAMES, videoDuration, type Scene, type VideoProps } from "./schema";

// The narration already says what's on screen in these scenes, so the template's own line steps
// aside for the captions.
const HIDE_FOR_CAPTIONS: Record<string, string[]> = { cover: ["subtitle"], props: ["subtitle"], hero: [] };

function withHidden(design: DesignProps, els: string[]): DesignProps {
  const overrides = { ...design.overrides };
  for (const el of els) overrides[el] = { ...overrides[el], hidden: true };
  return { ...design, overrides, watermark: false }; // the video draws its own, once
}

/** The lecturer up close in their world: a slow push, rim light, the brand name on top. */
const HeroScene: React.FC<{ design: DesignProps }> = ({ design }) => {
  const frame = useCurrentFrame();
  const { width: W, height: H, durationInFrames } = useVideoConfig();
  const enter = useEnter();
  const { bg, ink, muted, accent } = design.brand.palette;
  const s = design.assets.subject;
  const push = interpolate(frame, [0, Math.min(durationInFrames, 240)], [1.2, 1.05], { extrapolateRight: "clamp" });
  const w = W * 0.98;
  const h = s ? w / s.aspect : 0;
  const lightFrom = design.subjectSide === "left" ? "right" : "left";
  return (
    <AbsoluteFill style={{ background: bg, overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `scale(${push})` }}>
        <Img src={design.assets.backgroundTall ?? design.assets.background} style={{ width: "100%", height: "100%", objectFit: "cover", filter: "brightness(0.6) saturate(0.85)" }} />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: `linear-gradient(to top, ${bg} 0%, ${bg}${alpha(0.4)} 40%, ${bg}${alpha(0.75)} 100%)` }} />
      <div style={{ position: "absolute", top: H * 0.13, width: "100%", display: "flex", justifyContent: "center", direction: "ltr" }}>
        <MetalText text={design.copy.wordmark.join(" ")} font={fontFamily(design.brand.displayFont as FontName)} size={W * 0.1} ink={ink} muted={muted} progress={enter(4)} />
      </div>
      {s && (
        <>
          <Glow x={W / 2} y={H - h * 0.7} size={W * 1.2} color={accent} opacity={0.25} />
          <Hero src={s.src} box={{ left: (W - w) / 2, top: H - h * 0.92, width: w, height: h }} bg={bg} accent={accent} lightFrom={lightFrom} progress={enter(0, 20)} />
        </>
      )}
      <AbsoluteFill style={{ background: `linear-gradient(to top, ${bg} 0%, transparent 30%)` }} />
      <Vignette strength={0.5} />
      <Grain opacity={0.12} />
    </AbsoluteFill>
  );
};

/** The last word: brand, promise, price and the button. */
const EndCard: React.FC<{ design: DesignProps }> = ({ design }) => {
  const { width: W, height: H } = useVideoConfig();
  const enter = useEnter();
  const { bg, ink, muted, accent } = design.brand.palette;
  const body = fontFamily(design.brand.bodyFont as FontName);
  return (
    <AbsoluteFill style={{ background: bg, overflow: "hidden", direction: "rtl" }}>
      <AbsoluteFill>
        <Img src={design.assets.backgroundTall ?? design.assets.background} style={{ width: "100%", height: "100%", objectFit: "cover", filter: "blur(18px) brightness(0.45)" }} />
      </AbsoluteFill>
      <Glow x={W / 2} y={H * 0.42} size={W * 1.3} color={accent} opacity={0.3} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: H * 0.03, padding: W * 0.08, textAlign: "center" }}>
        <div style={{ direction: "ltr" }}>
          {design.copy.wordmark.map((l, i) => (
            <MetalText key={i} text={l} font={fontFamily(design.brand.displayFont as FontName)} size={W * 0.16} ink={ink} muted={muted} progress={enter(2 + i * 4)} />
          ))}
        </div>
        <div style={{ fontFamily: body, fontWeight: 700, fontSize: W * 0.055, color: ink, opacity: enter(14), lineHeight: 1.25, textWrap: "balance" }}>
          {design.copy.subtitle}
        </div>
        {design.copy.price && (
          <div style={{ fontFamily: fontFamily(design.brand.headlineFont as FontName), fontWeight: 900, fontSize: W * 0.11, color: accent, opacity: enter(20) }}>
            {design.copy.price}
          </div>
        )}
        <CtaButton text={design.copy.cta} font={body} size={W * 0.055} color={accent} ink={inkOn(accent)} progress={enter(26)} />
      </AbsoluteFill>
      <Grain opacity={0.1} />
    </AbsoluteFill>
  );
};

function SceneVisual({ scene, design, cover }: { scene: Scene; design: DesignProps; cover: TemplateId }) {
  const d = withHidden(design, HIDE_FOR_CAPTIONS[scene.type] ?? []);
  switch (scene.type) {
    case "cover": {
      const C = TEMPLATES[cover].component;
      return <C {...d} />;
    }
    case "hook": {
      const C = TEMPLATES["headline-impact"].component;
      return <C {...d} />;
    }
    case "bullets": {
      const C = TEMPLATES["ad-list"].component;
      return <C {...d} />;
    }
    case "props": {
      if (!design.assets.props.length) return <HeroScene design={d} />;
      const C = TEMPLATES["studio-props"].component;
      return <C {...d} />;
    }
    case "cta":
      return <EndCard design={d} />;
    default:
      return <HeroScene design={d} />;
  }
}

const CAPTIONED = new Set(["cover", "hero", "hook", "props"]);
const PRESENTATIONS = [fade(), slide({ direction: "from-bottom" }), fade(), slide({ direction: "from-right" })];

const Video: React.FC<VideoProps> = ({ design, cover, scenes, music, captions }) => {
  const { durationInFrames, fps } = useVideoConfig();
  const ink = design.brand.palette.ink;
  const accent = design.brand.palette.accent;
  const capFont = fontFamily(design.brand.headlineFont as FontName);
  return (
    <AbsoluteFill style={{ background: design.brand.palette.bg }}>
      <TransitionSeries>
        {scenes.flatMap((scene, i) => {
          const seq = (
            <TransitionSeries.Sequence key={`s${i}`} durationInFrames={scene.durationInFrames}>
              <SceneVisual scene={scene} design={design} cover={cover as TemplateId} />
              {captions && CAPTIONED.has(scene.type) && <Captions scene={scene} font={capFont} accent={accent} ink={ink} />}
              {scene.audio && <Audio src={scene.audio} />}
            </TransitionSeries.Sequence>
          );
          if (i === scenes.length - 1) return [seq];
          return [
            seq,
            <TransitionSeries.Transition
              key={`t${i}`}
              presentation={PRESENTATIONS[i % PRESENTATIONS.length]}
              timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
            />,
          ];
        })}
      </TransitionSeries>
      {design.watermark && <Watermark />}
      {music && (
        <Audio
          src={music}
          volume={(f) =>
            interpolate(f, [0, fps * 0.6, durationInFrames - fps * 1.2, durationInFrames - 1], [0, 0.16, 0.16, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })
          }
        />
      )}
    </AbsoluteFill>
  );
};

/** The video, drawn once the brand's fonts are loaded (captions are measured and styled with them). */
export const VideoComposition: React.FC<VideoProps> = (p) => {
  const b = p.design.brand;
  const ready = useFontsReady([b.displayFont, b.headlineFont, b.bodyFont] as FontName[]);
  return ready ? <Video {...p} /> : null;
};

export const calculateVideoMetadata: CalculateMetadataFunction<VideoProps> = ({ props }) => ({
  durationInFrames: videoDuration(props.scenes),
  fps: 30,
  width: 1080,
  height: 1920,
});
