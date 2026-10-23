// What the camera shows in each beat. Every shot moves (a push, a drift, parallax between the layers)
// and a long beat cuts once inside itself, from a wide frame to a close one, the way an editor covers
// a line with two angles. Titles sit in their zone over a scrim of the brand's ground; the captions'
// zone below is left clear.
import { AbsoluteFill, Freeze, Img, interpolate, OffthreadVideo, Sequence, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { TemplateId } from "../catalog";
import type { DesignProps } from "../design";
import { fitLines } from "../fit";
import { fontFamily, type FontName } from "../fonts";
import { alpha, Glow, Grain, Vignette } from "../fx";
import { CtaButton, Hero, inkOn, isLightBg, Logo, MetalText } from "../parts";
import { TEMPLATES } from "../templates";
import { KineticTitle, PriceTitle, splitPrice, ZONES } from "./kinetic";
import type { Scene, VideoProps } from "./schema";

export type ShotProps = { scene: Scene; design: DesignProps; kind: "promo" | "marketing"; cover: TemplateId; backdrops?: VideoProps["backdrops"] };

/** The kit's scene, blurred: the pre-blurred file when there is one, else a CSS blur. */
function backdrop(p: Pick<ShotProps, "design" | "backdrops">, depth: "soft" | "deep", px: number) {
  const ready = p.backdrops?.[depth];
  return { src: ready ?? p.design.assets.backgroundTall ?? p.design.assets.background, blur: ready ? "" : `blur(${px}px) ` };
}

const fonts = (d: DesignProps) => ({
  display: fontFamily(d.brand.displayFont as FontName),
  head: fontFamily(d.brand.headlineFont as FontName),
  body: fontFamily(d.brand.bodyFont as FontName),
});

/** 0 before the beat's inner cut, 1 after it; and the frame within the current angle. */
function useAngle(scene: Scene) {
  const frame = useCurrentFrame();
  const second = scene.cut !== undefined && frame >= scene.cut;
  return { second, local: second ? frame - scene.cut! : frame, frame };
}

/** A still under a moving camera: a slow push on the wide angle, a tighter, drifting close-up after the cut. */
const Camera: React.FC<{ src: string; scene: Scene; focus?: [number, number]; filter?: string; kind: ShotProps["kind"] }> = ({ src, scene, focus = [50, 42], filter, kind }) => {
  const { second, local } = useAngle(scene);
  const { durationInFrames } = useVideoConfig();
  const span = second ? durationInFrames - (scene.cut ?? 0) : (scene.cut ?? durationInFrames);
  const k = Math.min(1, local / Math.max(1, span));
  const energy = kind === "marketing" ? 1.4 : 1;
  const scale = second ? 1.42 + 0.06 * k * energy : 1.04 + 0.1 * k * energy;
  const drift = second ? (k - 0.5) * 2.4 * energy : 0;
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Img
        src={src}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `scale(${scale}) translateX(${drift}%)`,
          transformOrigin: second ? `${focus[0]}% ${focus[1]}%` : "50% 50%",
          filter,
        }}
      />
    </AbsoluteFill>
  );
};

/** The brand's ground behind a title zone, so the words read on any picture. */
const Scrim: React.FC<{ design: DesignProps; at: "top" | "middle" | "bottom"; strength?: number }> = ({ design, at, strength = 1 }) => {
  const bg = design.brand.palette.bg;
  // A light ground needs more of itself behind dark words: bright photos are close to it in tone.
  const boost = isLightBg(bg) ? 1.22 : 1;
  const a = (x: number) => `${bg}${alpha(Math.min(0.96, x * strength * boost))}`;
  const g =
    at === "top"
      ? `linear-gradient(to bottom, ${a(0.92)} 0%, ${a(0.7)} 24%, transparent 46%)`
      : at === "middle"
        ? `linear-gradient(to bottom, transparent 16%, ${a(0.74)} 32%, ${a(0.74)} 58%, transparent 74%)`
        : `linear-gradient(to top, ${a(0.85)} 0%, transparent 40%)`;
  return <AbsoluteFill style={{ background: g }} />;
};

// The captions' zone gets a soft dark band of its own on bright pictures.
const CaptionBed: React.FC = () => <AbsoluteFill style={{ background: `linear-gradient(to top, transparent 14%, #000000${alpha(0.38)} 24%, #000000${alpha(0.38)} 31%, transparent 40%)` }} />;

const Title: React.FC<ShotProps & { zone: "top" | "middle"; delay?: number }> = ({ scene, design, kind, zone, delay = 4 }) => {
  const f = fonts(design);
  const { ink, accent } = design.brand.palette;
  const price = scene.role === "offer" ? splitPrice(scene.title) : null;
  if (price) return <PriceTitle price={price.number} rest={[price.rest, scene.sub].filter(Boolean).join(" · ")} zone={ZONES[zone]} font={f.head} subFont={f.body} ink={ink} accent={accent} delay={delay} />;
  return <KineticTitle text={scene.title} sub={scene.sub || undefined} zone={ZONES[zone]} font={f.head} subFont={f.body} ink={ink} accent={accent} kind={kind} emphasis={scene.emphasis} glow={design.brand.palette.bg} delay={delay} />;
};

const Finish: React.FC<{ kind: ShotProps["kind"] }> = ({ kind }) => (
  <>
    <Vignette strength={kind === "promo" ? 0.6 : 0.35} />
    <Grain opacity={kind === "promo" ? 0.13 : 0.07} />
  </>
);

/** A moment from the field's world: its own still (or the kit's scene), the title over the middle. */
export const SceneShot: React.FC<ShotProps> = (p) => {
  const { scene, design, kind } = p;
  const { fps, durationInFrames } = useVideoConfig();
  const src = scene.image ?? design.assets.backgroundTall ?? design.assets.background;
  const light = isLightBg(design.brand.palette.bg);
  const grade = light ? "saturate(0.95)" : "brightness(0.82) saturate(0.9)";
  // An AI clip runs 5 seconds: a longer beat plays it a little slower, and past its end the still
  // it was made from carries on under the same camera.
  const rate = Math.max(0.6, Math.min(1, (5 * fps) / durationInFrames));
  return (
    <AbsoluteFill style={{ background: design.brand.palette.bg }}>
      <Camera src={src} scene={scene.motion ? { ...scene, cut: undefined } : scene} kind={kind} focus={[55, 45]} filter={grade} />
      {scene.motion && (
        <Sequence durationInFrames={Math.floor((5 * fps) / rate) - 2} layout="none">
          <AbsoluteFill>
            <OffthreadVideo src={scene.motion} muted playbackRate={rate} style={{ width: "100%", height: "100%", objectFit: "cover", filter: grade }} />
          </AbsoluteFill>
        </Sequence>
      )}
      <Scrim design={design} at="middle" strength={scene.title ? 1 : 0} />
      <CaptionBed />
      <Title {...p} zone="middle" />
      <Finish kind={kind} />
    </AbsoluteFill>
  );
};

/** Footage from the course. Vertical footage fills the frame; landscape footage floats in a frame of
 * its own over the blurred scene, tagged as the real thing, with the title above it. */
export const ClipShot: React.FC<ShotProps> = (p) => {
  const { scene, design, kind } = p;
  const { width: W, height: H, fps, durationInFrames } = useVideoConfig();
  const frame = useCurrentFrame();
  const clip = scene.clip;
  if (!clip) return <SceneShot {...p} />;
  const { bg, accent, ink } = design.brand.palette;
  const f = fonts(design);
  const k = frame / durationInFrames;
  const video = (style: React.CSSProperties) => (
    <OffthreadVideo src={clip.src} startFrom={Math.round(clip.start * fps)} playbackRate={clip.rate} muted={!clip.audio} style={{ width: "100%", height: "100%", objectFit: "cover", ...style }} />
  );
  if (clip.aspect < 0.8) {
    return (
      <AbsoluteFill style={{ background: bg, overflow: "hidden" }}>
        <AbsoluteFill style={{ transform: `scale(${1.03 + 0.05 * k})` }}>{video({})}</AbsoluteFill>
        <Scrim design={design} at="top" strength={scene.title ? 0.9 : 0} />
        <CaptionBed />
        <Title {...p} zone="top" />
        <Finish kind={kind} />
      </AbsoluteFill>
    );
  }
  const deep = backdrop(p, "deep", 24);
  const enter = spring({ frame, fps, config: { damping: 18, stiffness: 140 } });
  const w = W * 0.92;
  const h = w / clip.aspect;
  const top = H * 0.49 - h / 2;
  const tag = W * 0.032;
  return (
    <AbsoluteFill style={{ background: bg, overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `scale(${1.1 + 0.04 * k})` }}>
        <Img src={deep.src} style={{ width: "100%", height: "100%", objectFit: "cover", filter: `${deep.blur}brightness(${isLightBg(bg) ? 0.85 : 0.45})` }} />
      </AbsoluteFill>
      <Glow x={W / 2} y={H * 0.49} size={W * 1.3} color={accent} opacity={0.22} />
      <div
        style={{
          position: "absolute",
          left: (W - w) / 2,
          top,
          width: w,
          height: h,
          borderRadius: W * 0.03,
          overflow: "hidden",
          boxShadow: `0 ${H * 0.02}px ${H * 0.06}px #000000${alpha(0.6)}, 0 0 0 2px ${accent}${alpha(0.55)}`,
          transform: `scale(${interpolate(enter, [0, 1], [0.86, 1]) * (1 + 0.025 * k)})`,
          opacity: interpolate(enter, [0, 0.3], [0, 1], { extrapolateRight: "clamp" }),
        }}
      >
        {video({})}
      </div>
      <div
        style={{
          position: "absolute",
          top: top - tag * 2.4,
          right: (W - w) / 2,
          display: "flex",
          alignItems: "center",
          gap: tag * 0.4,
          direction: "rtl",
          fontFamily: f.body,
          fontWeight: 800,
          fontSize: tag,
          color: ink,
          opacity: enter,
        }}
      >
        <span style={{ width: tag * 0.55, height: tag * 0.55, borderRadius: "50%", background: "#ff3b30", opacity: 0.6 + 0.4 * Math.abs(Math.sin(frame / 9)) }} />
        מתוך הקורס
      </div>
      <Scrim design={design} at="top" strength={scene.title ? 0.7 : 0} />
      <Title {...p} zone="top" />
      <Finish kind={kind} />
    </AbsoluteFill>
  );
};

/** The lecturer in their world: the scene behind moves slower than they do (parallax); after the cut,
 * the camera is close on the face. The face is kept below the title zone and above the captions. */
export const LecturerShot: React.FC<ShotProps> = (p) => {
  const { scene, design, kind } = p;
  const { width: W, height: H, durationInFrames } = useVideoConfig();
  const { second, local, frame } = useAngle(scene);
  const s = design.assets.subject;
  if (!s) return <SceneShot {...p} />;
  const soft = backdrop(p, "soft", 3);
  const { bg, accent } = design.brand.palette;
  const light = isLightBg(bg);
  const k = frame / durationInFrames;
  const w = W * 1.02;
  const h = w / s.aspect;
  const top = Math.max(H * 0.33, H - h * 0.95);
  const faceY = top + Math.min(h, H - top) * 0.16;
  const close = second ? 1.34 + 0.04 * (local / Math.max(1, durationInFrames - (scene.cut ?? 0))) : 1 + 0.035 * k;
  const enter = spring({ frame, fps: 30, config: { damping: 200 }, durationInFrames: 16 });
  return (
    <AbsoluteFill style={{ background: bg, overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `scale(${1.16 - 0.06 * k}) translateX(${(k - 0.5) * -2}%)` }}>
        <Img src={soft.src} style={{ width: "100%", height: "100%", objectFit: "cover", filter: light ? `${soft.blur}saturate(0.9)` : `${soft.blur}brightness(0.55) saturate(0.85)` }} />
      </AbsoluteFill>
      <Glow x={W / 2} y={faceY} size={W * 1.3} color={accent} opacity={0.22} />
      <AbsoluteFill style={{ transform: `scale(${close}) translateX(${(k - 0.5) * 1.2}%)`, transformOrigin: `50% ${(faceY / H) * 100}%` }}>
        <Hero src={s.src} box={{ left: (W - w) / 2, top, width: w, height: h }} bg={bg} accent={accent} lightFrom={design.subjectSide === "left" ? "right" : "left"} progress={second ? 1 : enter} />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: `linear-gradient(to top, ${bg} 0%, ${bg}${alpha(0.5)} 14%, transparent 34%)` }} />
      <Scrim design={design} at="top" strength={scene.title ? 1 : 0.5} />
      <CaptionBed />
      <Title {...p} zone="top" />
      <Finish kind={kind} />
    </AbsoluteFill>
  );
};

/** The kit's display graphic as a poster in space: it swings in on a 3D turn, the light passes over it. */
export const CoverShot: React.FC<ShotProps> = (p) => {
  const { scene, design, kind, cover } = p;
  const { width: W, height: H, fps, durationInFrames } = useVideoConfig();
  const { second, frame } = useAngle(scene);
  const C = TEMPLATES[cover].component;
  const deep = backdrop(p, "deep", 22);
  const enter = spring({ frame, fps, config: { damping: 18, stiffness: 120 } });
  const k = frame / durationInFrames;
  const turn = second ? -6 + 4 * k : interpolate(enter, [0, 1], [28, 6]) - 4 * k;
  const scale = second ? 0.62 + 0.02 * k : interpolate(enter, [0, 1], [0.48, 0.56]) + 0.02 * k;
  const sweep = interpolate(frame % 90, [10, 50], [-40, 140], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const coverDesign: DesignProps = {
    ...design,
    watermark: false,
    copy: { ...design.copy, ...(scene.title ? { headline: scene.title } : {}), ...(scene.sub ? { subtitle: scene.sub } : {}) },
  };
  // The card's bottom edge stays above the captions' zone at any scale.
  const cardTop = H * (ZONES.captions - 0.075) - H / 2 - (H * scale) / 2;
  return (
    <AbsoluteFill style={{ background: design.brand.palette.bg, overflow: "hidden", perspective: 1800 }}>
      <AbsoluteFill>
        <Img src={deep.src} style={{ width: "100%", height: "100%", objectFit: "cover", filter: `${deep.blur}brightness(0.5)`, transform: "scale(1.2)" }} />
      </AbsoluteFill>
      <Glow x={W / 2} y={H * 0.36} size={W * 1.4} color={design.brand.palette.accent} opacity={0.3} />
      <div
        style={{
          position: "absolute",
          left: 0,
          top: cardTop,
          width: W,
          height: H,
          transform: `scale(${scale}) rotateY(${turn}deg) rotateX(${second ? 2 : 4}deg)`,
          transformOrigin: "50% 50%",
          borderRadius: 40,
          overflow: "hidden",
          boxShadow: `0 60px 140px #000000${alpha(0.7)}`,
        }}
      >
        {/* The graphic as finished (its own entrance would replay inside the card); the card moves. */}
        <Freeze frame={89}>
          <C {...coverDesign} />
        </Freeze>
        <AbsoluteFill style={{ background: `linear-gradient(110deg, transparent ${sweep - 18}%, #ffffff${alpha(0.22)} ${sweep}%, transparent ${sweep + 18}%)` }} />
      </div>
      <CaptionBed />
      <Finish kind={kind} />
    </AbsoluteFill>
  );
};

/** The field's objects floating at different depths around the title. */
export const PropsShot: React.FC<ShotProps> = (p) => {
  const { scene, design, kind } = p;
  const { width: W, height: H, fps } = useVideoConfig();
  const { frame, second } = useAngle(scene);
  const props = design.assets.props;
  if (!props.length) return <SceneShot {...p} />;
  const soft = backdrop(p, "soft", 2);
  const spots: [number, number, number][] = [
    [0.08, 0.42, 0.42],
    [0.54, 0.36, 0.38],
    [0.28, 0.5, 0.34],
  ];
  return (
    <AbsoluteFill style={{ background: design.brand.palette.bg, overflow: "hidden" }}>
      <Camera src={soft.src} scene={{ ...scene, cut: undefined }} kind={kind} filter={`${soft.blur}brightness(0.7)`} />
      <Glow x={W / 2} y={H * 0.48} size={W * 1.2} color={design.brand.palette.accent} opacity={0.25} />
      {props.slice(0, 3).map((prop, i) => {
        const [x, y, size] = spots[i];
        const enter = spring({ frame: frame - i * 5, fps, config: { damping: 14, stiffness: 120 } });
        const bob = Math.sin((frame + i * 20) / (18 + i * 4)) * H * 0.008;
        const depth = 1 + i * 0.12;
        const w = W * size * (second ? 1.25 : 1) * depth * 0.9;
        return (
          <Img
            key={i}
            src={prop.src}
            style={{
              position: "absolute",
              left: W * x * (second ? 0.85 : 1),
              top: H * y + bob,
              width: w,
              height: w / prop.aspect,
              objectFit: "contain",
              transform: `scale(${enter}) rotate(${(1 - enter) * (i % 2 ? 20 : -20) + Math.sin(frame / 40 + i) * 3}deg)`,
              filter: `drop-shadow(0 ${H * 0.02}px ${H * 0.03}px #000000${alpha(0.55)})`,
            }}
          />
        );
      })}
      <Scrim design={design} at="top" />
      <CaptionBed />
      <Title {...p} zone="top" />
      <Finish kind={kind} />
    </AbsoluteFill>
  );
};

/** The outcomes, one row at a time as the narration goes, each with its mark. */
export const ListShot: React.FC<ShotProps> = (p) => {
  const { scene, design, kind } = p;
  const { width: W, height: H, fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const { bg, ink, accent } = design.brand.palette;
  const f = fonts(design);
  const items = scene.items.length ? scene.items : design.copy.bullets.slice(0, 4);
  const light = isLightBg(bg);
  const zoneTop = H * 0.27;
  const zoneH = H * 0.4;
  const rowH = Math.min(H * 0.095, zoneH / items.length);
  const textW = W * 0.68;
  const size = Math.min(fitLines(items, textW, f.body) * 0.95, rowH * 0.36);
  const at = listTimes(scene, items.length);
  const deep = backdrop(p, "deep", 16);
  return (
    <AbsoluteFill style={{ background: bg, overflow: "hidden" }}>
      <Camera src={deep.src} scene={{ ...scene, cut: undefined }} kind={kind} filter={light ? `${deep.blur}saturate(0.9)` : `${deep.blur}brightness(0.5)`} />
      <AbsoluteFill style={{ background: `${bg}${alpha(light ? 0.55 : 0.35)}` }} />
      <Title {...p} zone="top" delay={0} />
      <div style={{ position: "absolute", top: zoneTop, left: W * 0.07, right: W * 0.07, height: zoneH, display: "flex", flexDirection: "column", justifyContent: "center", gap: rowH * 0.18, direction: "rtl" }}>
        {items.map((item, i) => {
          const pIn = spring({ frame: frame - at[i], fps, config: { damping: 15, stiffness: 160 } });
          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                alignSelf: "stretch",
                gap: rowH * 0.22,
                height: rowH * 0.82,
                padding: `0 ${rowH * 0.24}px`,
                borderRadius: rowH * 0.28,
                background: light ? `#ffffff${alpha(0.78)}` : `#ffffff${alpha(0.09)}`,
                border: `1px solid ${light ? `#000000${alpha(0.06)}` : `#ffffff${alpha(0.14)}`}`,
                boxShadow: `0 ${rowH * 0.1}px ${rowH * 0.4}px #000000${alpha(0.25)}`,
                transform: `translateX(${(1 - pIn) * W * 0.5}px)`,
                opacity: interpolate(pIn, [0, 0.4], [0, 1], { extrapolateRight: "clamp" }),
              }}
            >
              <div style={{ flex: "none", width: rowH * 0.5, height: rowH * 0.5, borderRadius: "50%", background: accent, display: "grid", placeItems: "center", boxShadow: `0 0 ${rowH * 0.4}px ${accent}${alpha(0.5)}` }}>
                <svg viewBox="0 0 24 24" width={rowH * 0.3} height={rowH * 0.3} style={{ transform: `scale(${spring({ frame: frame - at[i] - 5, fps, config: { damping: 10, stiffness: 200 } })})` }}>
                  <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke={inkOn(accent)} strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div style={{ fontFamily: f.body, fontWeight: 800, fontSize: size, color: light ? "#14141c" : ink, whiteSpace: "nowrap" }}>{item}</div>
            </div>
          );
        })}
      </div>
      <Finish kind={kind} />
    </AbsoluteFill>
  );
};

/** When each list row appears (frames): spread over the narration, the first one right after the title. */
export function listTimes(scene: Scene, n: number): number[] {
  const startS = scene.words[0]?.start ?? scene.lead / 30;
  const endS = Math.max(startS + 1, (scene.words.at(-1)?.end ?? scene.durationInFrames / 30) - 0.3);
  return Array.from({ length: n }, (_, i) => Math.round((startS + ((endS - startS) * i) / Math.max(1, n)) * 30) + 6);
}

/** The brand's logo revealed by light; the title under it. */
export const LogoShot: React.FC<ShotProps> = (p) => {
  const { scene, design, kind } = p;
  const { width: W, height: H, fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const { bg, ink, muted, accent } = design.brand.palette;
  const f = fonts(design);
  const enter = spring({ frame, fps, config: { damping: 20, stiffness: 90 } });
  const sweep = interpolate(frame, [8, 40], [-30, 130], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const light = isLightBg(bg);
  const deep = backdrop(p, "deep", 24);
  return (
    <AbsoluteFill style={{ background: bg, overflow: "hidden" }}>
      <Camera src={deep.src} scene={{ ...scene, cut: undefined }} kind={kind} filter={light ? deep.blur || undefined : `${deep.blur}brightness(0.4)`} />
      <AbsoluteFill style={{ background: `${bg}${alpha(0.55)}` }} />
      <Glow x={W / 2} y={H * 0.36} size={W * 1.1} color={accent} opacity={0.35 * enter} />
      <div style={{ position: "absolute", top: H * 0.24, left: 0, right: 0, height: H * 0.22, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${interpolate(enter, [0, 1], [0.7, 1])})`, opacity: enter }}>
        {design.assets.logo ? (
          <div style={{ position: "relative" }}>
            <Logo logo={design.assets.logo} height={H * 0.13} maxWidth={W * 0.7} bg={bg} />
            <AbsoluteFill style={{ background: `linear-gradient(110deg, transparent ${sweep - 15}%, #ffffff${alpha(0.75)} ${sweep}%, transparent ${sweep + 15}%)`, mixBlendMode: "overlay" }} />
          </div>
        ) : (
          <div style={{ direction: "ltr" }}>
            <MetalText text={design.copy.wordmark.join(" ")} font={f.display} size={Math.min(W * 0.16, fitLines([design.copy.wordmark.join(" ")], W * 0.86, f.display, { uppercase: true }))} ink={ink} muted={muted} tint={light ? ink : undefined} progress={enter} />
          </div>
        )}
      </div>
      <KineticTitle text={scene.title} sub={scene.sub || undefined} zone={{ top: 0.47, height: 0.16 }} font={f.head} subFont={f.body} ink={ink} accent={accent} kind={kind} emphasis={scene.emphasis} glow={bg} delay={12} />
      <Finish kind={kind} />
    </AbsoluteFill>
  );
};

/** The last word: logo, the course name, the title, the price split big, and the button. */
export const EndCard: React.FC<ShotProps> = (p) => {
  const { scene, design, kind } = p;
  const deep = backdrop(p, "deep", 18);
  const { width: W, height: H, fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const { bg, ink, muted, accent } = design.brand.palette;
  const f = fonts(design);
  const light = isLightBg(bg);
  const enter = (d: number) => spring({ frame: frame - d, fps, config: { damping: 200 }, durationInFrames: 18 });
  const price = design.copy.price ? splitPrice(design.copy.price) : null;
  const nameSize = Math.min(W * 0.15, fitLines(design.copy.wordmark, W * 0.84, f.display, { uppercase: true }));
  // The title, unless it only repeats the button or the name.
  const same = (a: string, b: string) => a.replace(/[^\p{L}\p{N}]/gu, "") === b.replace(/[^\p{L}\p{N}]/gu, "");
  const line = [scene.title, scene.sub].find((x) => x && !same(x, design.copy.cta) && !same(x, design.copy.wordmark.join(""))) ?? "";
  const titleSize = line ? Math.min(W * 0.075, fitLines([line], W * 0.84, f.head)) : 0;
  const ctaSize = Math.min(W * 0.058, fitLines([design.copy.cta], W * 0.6, f.body));
  return (
    <AbsoluteFill style={{ background: bg, overflow: "hidden", direction: "rtl" }}>
      <AbsoluteFill style={{ transform: `scale(${1.15 + frame / 2000})` }}>
        <Img src={deep.src} style={{ width: "100%", height: "100%", objectFit: "cover", filter: light ? deep.blur || undefined : `${deep.blur}brightness(0.42)` }} />
      </AbsoluteFill>
      {light && <AbsoluteFill style={{ background: `${bg}${alpha(0.8)}` }} />}
      <Glow x={W / 2} y={H * 0.4} size={W * 1.3} color={accent} opacity={0.3} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: H * 0.026, padding: `${H * 0.1}px ${W * 0.08}px ${H * 0.2}px`, textAlign: "center" }}>
        <Logo logo={design.assets.logo} height={W * 0.13} maxWidth={W * 0.5} bg={bg} progress={enter(0)} />
        <div style={{ direction: "ltr" }}>
          {design.copy.wordmark.map((l, i) => (
            <MetalText key={i} text={l} font={f.display} size={nameSize} ink={ink} muted={muted} tint={light ? ink : undefined} progress={enter(3 + i * 4)} />
          ))}
        </div>
        {line && <div style={{ fontFamily: f.head, fontWeight: 900, fontSize: titleSize, color: ink, opacity: enter(12), whiteSpace: "nowrap" }}>{line}</div>}
        {price && (
          <div style={{ display: "flex", alignItems: "baseline", gap: W * 0.02, opacity: enter(18), transform: `scale(${interpolate(enter(18), [0, 1], [1.4, 1])})` }}>
            <span style={{ fontFamily: f.head, fontWeight: 900, fontSize: W * 0.13, color: accent, direction: "ltr" }}>{price.number}</span>
            {price.rest && <span style={{ fontFamily: f.body, fontWeight: 700, fontSize: W * 0.045, color: ink }}>{price.rest}</span>}
          </div>
        )}
        <CtaButton text={design.copy.cta} font={f.body} size={ctaSize} color={accent} ink={inkOn(accent)} progress={enter(24)} />
      </AbsoluteFill>
      <Finish kind={kind} />
    </AbsoluteFill>
  );
};

/** The shot for a scene: by its role first (the offer, the close), then by what it shows. */
export const Shot: React.FC<ShotProps> = (p) => {
  if (p.scene.role === "cta") return <EndCard {...p} />;
  switch (p.scene.visual) {
    case "lecturer":
      return <LecturerShot {...p} />;
    case "clip":
      return <ClipShot {...p} />;
    case "cover":
      return <CoverShot {...p} />;
    case "props":
      return <PropsShot {...p} />;
    case "list":
      return <ListShot {...p} />;
    case "logo":
      return <LogoShot {...p} />;
    default:
      return <SceneShot {...p} />;
  }
};

/** Whether the captions run over this shot (lists and the end card already show their words). */
export const captioned = (s: Scene) => s.role !== "cta" && s.visual !== "list";
