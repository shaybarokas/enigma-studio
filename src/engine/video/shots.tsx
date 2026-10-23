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

/** Which angle of the beat is on screen (a new one after each inner cut), and the frame within it. */
export function useAngle(scene: Scene) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const cuts = scene.cuts ?? [];
  let angle = 0;
  while (angle < cuts.length && frame >= cuts[angle]) angle++;
  const from = angle ? cuts[angle - 1] : 0;
  const to = cuts[angle] ?? durationInFrames;
  return { angle, second: angle % 2 === 1, local: frame - from, span: Math.max(1, to - from), frame };
}

// The camera's framings, angle after angle: wide with a push, close on the focus, a medium from the
// other side, very close. Each drifts a little while it holds.
const FRAMINGS = [
  { scale: 1.04, grow: 0.1, origin: "center" },
  { scale: 1.42, grow: 0.06, origin: "focus" },
  { scale: 1.2, grow: 0.07, origin: "mirror" },
  { scale: 1.58, grow: 0.05, origin: "focus" },
] as const;

/** A still under a moving camera, reframed at every inner cut of the beat. */
const Camera: React.FC<{ src: string; scene: Scene; focus?: [number, number]; filter?: string; kind: ShotProps["kind"] }> = ({ src, scene, focus = [50, 42], filter, kind }) => {
  const { angle, local, span } = useAngle(scene);
  const k = Math.min(1, local / span);
  const energy = kind === "marketing" ? 1.4 : 1;
  const f = FRAMINGS[angle % FRAMINGS.length];
  const scale = f.scale + f.grow * k * energy;
  const drift = angle ? (k - 0.5) * 2.4 * energy * (angle % 2 ? 1 : -1) : 0;
  const second = angle > 0;
  const origin = f.origin === "center" ? "50% 50%" : f.origin === "focus" ? `${focus[0]}% ${focus[1]}%` : `${100 - focus[0]}% ${focus[1]}%`;
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Img
        src={src}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `scale(${scale}) translateX(${drift}%)`,
          transformOrigin: second ? origin : "50% 50%",
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
      <Camera src={src} scene={scene.motion ? { ...scene, cuts: [] } : scene} kind={kind} focus={[55, 45]} filter={grade} />
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

/** Footage from the course, filling the frame: wide footage is cropped around the speaker (their
 * place across the frame comes from the clip's analysis), tagged as the real thing. */
export const ClipShot: React.FC<ShotProps> = (p) => {
  const { scene, design, kind } = p;
  const { width: W, height: H, durationInFrames } = useVideoConfig();
  const frame = useCurrentFrame();
  const clip = scene.clip;
  if (!clip) return <SceneShot {...p} />;
  const f = fonts(design);
  const k = frame / durationInFrames;
  const tag = W * 0.03;
  return (
    <AbsoluteFill style={{ background: design.brand.palette.bg, overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `scale(${1.02 + 0.05 * k})` }}>
        <Footage src={clip.src} start={clip.start} rate={clip.rate} muted={!clip.audio} x={clip.x} />
      </AbsoluteFill>
      {/* Course footage often carries its own titles at the top: they are blurred and covered by the
          ground under ours, so two titles never read at once. */}
      {scene.title && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            bottom: "auto",
            height: H * 0.36,
            backdropFilter: "blur(14px)",
            maskImage: "linear-gradient(to bottom, #000 70%, transparent)",
            WebkitMaskImage: "linear-gradient(to bottom, #000 70%, transparent)",
          }}
        />
      )}
      <Scrim design={design} at="top" strength={scene.title ? 1.25 : 0.4} />
      <CaptionBed />
      <div
        style={{
          position: "absolute",
          top: H * 0.315,
          right: W * 0.06,
          display: "flex",
          alignItems: "center",
          gap: tag * 0.4,
          padding: `${tag * 0.25}px ${tag * 0.6}px`,
          borderRadius: tag,
          background: `#000000${alpha(0.45)}`,
          direction: "rtl",
          fontFamily: f.body,
          fontWeight: 800,
          fontSize: tag,
          color: "#ffffff",
        }}
      >
        <span style={{ width: tag * 0.5, height: tag * 0.5, borderRadius: "50%", background: "#ff3b30", opacity: 0.6 + 0.4 * Math.abs(Math.sin(frame / 9)) }} />
        מתוך הקורס
      </div>
      <Title {...p} zone="top" />
      <Finish kind={kind} />
    </AbsoluteFill>
  );
};

/** A clip of the course playing full frame, cropped around the speaker. */
const Footage: React.FC<{ src: string; start: number; rate?: number; muted: boolean; x?: number }> = ({ src, start, rate = 1, muted, x = 0.5 }) => {
  const { fps } = useVideoConfig();
  return (
    <OffthreadVideo
      src={src}
      startFrom={Math.round(start * fps)}
      playbackRate={rate}
      muted={muted}
      style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: `${Math.round(x * 100)}% 40%` }}
    />
  );
};

/** The cut-away in the middle of a beat: its own still under a close, drifting camera, or a moment of
 * the course's footage. The beat's title stays where it was. */
const InsertShot: React.FC<ShotProps & { zone: "top" | "middle" | null }> = (p) => {
  const { scene, design, kind, zone } = p;
  const { local, span } = useAngle(scene);
  const ins = scene.insert!;
  const light = isLightBg(design.brand.palette.bg);
  const t = local / span;
  return (
    <AbsoluteFill style={{ background: design.brand.palette.bg, overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `scale(${1.08 + 0.06 * t}) translateX(${(t - 0.5) * 2}%)` }}>
        {ins.clip ? (
          <Footage src={ins.clip.src} start={ins.clip.start} muted x={ins.clip.x} />
        ) : (
          <Img src={ins.image!} style={{ width: "100%", height: "100%", objectFit: "cover", filter: light ? "saturate(0.95)" : "brightness(0.85) saturate(0.9)" }} />
        )}
      </AbsoluteFill>
      {zone && <Scrim design={design} at={zone} strength={scene.title ? 1 : 0} />}
      <CaptionBed />
      {zone && <Title {...p} zone={zone} />}
      <Finish kind={kind} />
    </AbsoluteFill>
  );
};

/** The lecturer in their world: the scene behind moves slower than they do (parallax); after the cut,
 * the camera is close on the face. The face is kept below the title zone and above the captions. */
export const LecturerShot: React.FC<ShotProps> = (p) => {
  const { scene, design, kind } = p;
  const { width: W, height: H, durationInFrames } = useVideoConfig();
  const { angle, local, span, frame } = useAngle(scene);
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
  // Medium, then close on the face, then a looser medium from the side, then very close.
  const t = local / span;
  const close = [1 + 0.035 * k, 1.34 + 0.04 * t, 1.14 + 0.03 * t, 1.5 + 0.03 * t][angle % 4];
  const sideways = angle % 4 === 2 ? (design.subjectSide === "left" ? 4 : -4) : 0;
  const second = angle > 0;
  const enter = spring({ frame, fps: 30, config: { damping: 200 }, durationInFrames: 16 });
  return (
    <AbsoluteFill style={{ background: bg, overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `scale(${1.16 - 0.06 * k}) translateX(${(k - 0.5) * -2}%)` }}>
        <Img src={soft.src} style={{ width: "100%", height: "100%", objectFit: "cover", filter: light ? `${soft.blur}saturate(0.9)` : `${soft.blur}brightness(0.55) saturate(0.85)` }} />
      </AbsoluteFill>
      <Glow x={W / 2} y={faceY} size={W * 1.3} color={accent} opacity={0.22} />
      <AbsoluteFill style={{ transform: `scale(${close}) translateX(${(k - 0.5) * 1.2 + sideways}%)`, transformOrigin: `50% ${(faceY / H) * 100}%` }}>
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

/** The kit's display graphic, full screen so its words read: it swings in from a tilted card, then
 * the camera pushes in a little at each inner cut while a light passes over it. */
export const CoverShot: React.FC<ShotProps> = (p) => {
  const { scene, design, kind, cover } = p;
  const { fps } = useVideoConfig();
  const { angle, local, span, frame } = useAngle(scene);
  const C = TEMPLATES[cover].component;
  const enter = spring({ frame, fps, config: { damping: 20, stiffness: 110 }, durationInFrames: 22 });
  const t = local / span;
  const push = angle === 0 ? 1 + 0.04 * t : [1.08, 1.04, 1.12][(angle - 1) % 3] + 0.03 * t;
  const origin = ["50% 50%", "50% 30%", "50% 60%", "50% 25%"][angle % 4];
  const sweep = interpolate(frame % 90, [10, 50], [-40, 140], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const coverDesign: DesignProps = {
    ...design,
    watermark: false,
    copy: { ...design.copy, ...(scene.title ? { headline: scene.title } : {}), ...(scene.sub ? { subtitle: scene.sub } : {}) },
  };
  const scale = interpolate(enter, [0, 1], [0.62, 1]) * push;
  return (
    <AbsoluteFill style={{ background: design.brand.palette.bg, overflow: "hidden", perspective: 1800 }}>
      <AbsoluteFill
        style={{
          transform: `scale(${scale}) rotateY(${interpolate(enter, [0, 1], [24, 0])}deg)`,
          transformOrigin: origin,
          borderRadius: interpolate(enter, [0, 1], [48, 0]),
          overflow: "hidden",
          boxShadow: `0 60px 140px #000000${alpha(0.7 * (1 - enter))}`,
        }}
      >
        {/* The graphic as finished (its own entrance would replay); the camera moves over it. */}
        <Freeze frame={89}>
          <C {...coverDesign} />
        </Freeze>
        <AbsoluteFill style={{ background: `linear-gradient(110deg, transparent ${sweep - 18}%, #ffffff${alpha(0.18)} ${sweep}%, transparent ${sweep + 18}%)` }} />
      </AbsoluteFill>
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
      <Camera src={soft.src} scene={{ ...scene, cuts: [] }} kind={kind} filter={`${soft.blur}brightness(0.7)`} />
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
      <Camera src={deep.src} scene={{ ...scene, cuts: [] }} kind={kind} filter={light ? `${deep.blur}saturate(0.9)` : `${deep.blur}brightness(0.5)`} />
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
  const { width: W, height: H, fps, durationInFrames } = useVideoConfig();
  const frame = useCurrentFrame();
  const { bg, ink, muted, accent } = design.brand.palette;
  const f = fonts(design);
  const light = isLightBg(bg);
  const deep = backdrop(p, "deep", 24);
  // The reveal: a burst of light, the mark landing from out of focus, a sweep across it, sparks rising.
  const burst = interpolate(frame, [0, 4, 16], [0, 1, 0], { extrapolateRight: "clamp" });
  const enter = spring({ frame: frame - 3, fps, config: { damping: 16, stiffness: 120 } });
  const focus = interpolate(frame, [3, 16], [14, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const sweep = interpolate(frame, [10, 34], [-30, 130], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const drift = 1 + 0.05 * (frame / durationInFrames);
  return (
    <AbsoluteFill style={{ background: bg, overflow: "hidden" }}>
      <Camera src={deep.src} scene={{ ...scene, cuts: [] }} kind={kind} filter={light ? deep.blur || undefined : `${deep.blur}brightness(0.35)`} />
      <AbsoluteFill style={{ background: `${bg}${alpha(0.55)}` }} />
      <Glow x={W / 2} y={H * 0.35} size={W * (0.8 + 0.6 * enter)} color={accent} opacity={0.45 * enter} />
      {Array.from({ length: 14 }, (_, i) => {
        const x = ((i * 37) % 100) / 100;
        const rise = ((frame * (0.6 + (i % 5) * 0.15) + i * 23) % 120) / 120;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: W * (0.15 + x * 0.7),
              top: H * (0.52 - rise * 0.32),
              width: W * 0.006,
              height: W * 0.006,
              borderRadius: "50%",
              background: accent,
              boxShadow: `0 0 ${W * 0.012}px ${accent}`,
              opacity: enter * Math.sin(rise * Math.PI) * 0.9,
            }}
          />
        );
      })}
      <div
        style={{
          position: "absolute",
          top: H * 0.22,
          left: 0,
          right: 0,
          height: H * 0.24,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: `scale(${interpolate(enter, [0, 1], [1.3, 1]) * drift})`,
          opacity: interpolate(enter, [0, 0.4], [0, 1], { extrapolateRight: "clamp" }),
          filter: focus > 0.2 ? `blur(${focus}px)` : undefined,
        }}
      >
        {design.assets.logo ? (
          <div style={{ position: "relative" }}>
            <Logo logo={design.assets.logo} height={H * 0.14} maxWidth={W * 0.72} bg={bg} />
            <AbsoluteFill style={{ background: `linear-gradient(110deg, transparent ${sweep - 15}%, #ffffff${alpha(0.75)} ${sweep}%, transparent ${sweep + 15}%)`, mixBlendMode: "overlay" }} />
          </div>
        ) : (
          <div style={{ direction: "ltr" }}>
            <MetalText text={design.copy.wordmark.join(" ")} font={f.display} size={Math.min(W * 0.16, fitLines([design.copy.wordmark.join(" ")], W * 0.86, f.display, { uppercase: true }))} ink={ink} muted={muted} tint={light ? ink : undefined} progress={enter} />
          </div>
        )}
      </div>
      <AbsoluteFill style={{ background: "#ffffff", opacity: burst * (light ? 0.5 : 0.85), mixBlendMode: "screen" }} />
      <KineticTitle text={scene.title} sub={scene.sub || undefined} zone={{ top: 0.47, height: 0.16 }} font={f.head} subFont={f.body} ink={ink} accent={accent} kind={kind} emphasis={scene.emphasis} glow={bg} delay={10} />
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
  const { angle } = useAngle(p.scene);
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // A small punch-in of the camera on each word the narration stresses.
  const hot = new Set(p.scene.emphasis.map((w) => w.replace(/[.,!?:;…"״׳']/g, "")));
  const punch = p.scene.words
    .filter((w) => hot.has(w.text.replace(/[.,!?:;…"״׳']/g, "")))
    .reduce((a, w) => {
      const d = frame - Math.round(w.start * fps);
      return a + (d < 0 ? 0 : d < 3 ? (d / 3) * 0.045 : Math.max(0, 0.045 * (1 - (d - 3) / 10)));
    }, 0);
  // The cut-away takes the beat's second angle when it has one.
  const zone = p.scene.visual === "scene" ? "middle" : p.scene.visual === "cover" ? null : "top";
  const inner =
    p.scene.role === "cta" ? (
      <EndCard {...p} />
    ) : angle === 1 && p.scene.insert && ["lecturer", "scene", "cover", "props"].includes(p.scene.visual) ? (
      <InsertShot {...p} zone={zone} />
    ) : (
      <ShotFor {...p} />
    );
  return <AbsoluteFill style={{ transform: punch ? `scale(${1 + Math.min(punch, 0.06)})` : undefined }}>{inner}</AbsoluteFill>;
};

const ShotFor: React.FC<ShotProps> = (p) => {
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

/** Whether the captions run over this shot (lists, the display graphic and the end card show their own words). */
export const captioned = (s: Scene) => s.role !== "cta" && s.visual !== "list" && s.visual !== "cover";
