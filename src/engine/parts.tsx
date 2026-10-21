// Building blocks every template composes: placement with editor overrides, the graded scene, the
// relit hero, the metallic wordmark, pills and the call-to-action button.
import { AbsoluteFill, Img, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { alpha } from "./fx";
import type { Transform } from "./types";

export type Box = { left: number; top: number; width: number; height: number };

/** Spring 0→1 starting at `delay` frames. Stills render the last frame, so everything has landed. */
export function useEnter() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (delay: number, frames = 30) =>
    spring({ frame: frame - delay, fps, config: { damping: 200 }, durationInFrames: frames });
}

/** A positioned element the editor can select (data-el) and move, scale, rotate or hide (t). */
export const Placed: React.FC<{
  box: Box;
  el?: string;
  t?: Partial<Transform>;
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({ box, el, t, style, children }) => {
  const { width: W } = useVideoConfig();
  if (t?.hidden) return null;
  // A size change never pushes a full-width element out of the frame.
  const scale = Math.min(t?.scale ?? 1, Math.max(1, (W * 0.96) / box.width));
  return (
    <div
      data-el={el}
      style={{
        position: "absolute",
        ...box,
        transform: `translate(${t?.x ?? 0}px, ${t?.y ?? 0}px) scale(${scale}) rotate(${t?.rotate ?? 0}deg)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

/** Background scene with a slow push-in, graded toward the brand's darkest tone. */
export const Scene: React.FC<{ src: string; bg: string; grade?: number; blur?: number; brightness?: number }> = ({
  src,
  bg,
  grade = 0.4,
  blur = 0,
  brightness = 0.8,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const push = interpolate(frame, [0, durationInFrames], [1.14, 1.04]);
  const sceneIn = interpolate(frame, [0, 14], [0, 1], { extrapolateRight: "clamp" });
  return (
    <>
      <AbsoluteFill style={{ opacity: sceneIn, transform: `scale(${push})` }}>
        <Img
          src={src}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            filter: `saturate(0.85) brightness(${brightness}) blur(${blur}px)`,
          }}
        />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: bg, mixBlendMode: "multiply", opacity: grade }} />
    </>
  );
};

/**
 * The lecturer cut-out, relit to sit in the scene: light from `lightFrom`, far side in shadow, an
 * accent rim on the lit edge and a soft melt into the floor.
 */
export const Hero: React.FC<{
  src: string;
  box: Box;
  t?: Partial<Transform>;
  bg: string;
  accent: string;
  lightFrom: "left" | "right";
  progress: number;
  shadow?: number;
}> = ({ src, box, t, bg, accent, lightFrom, progress, shadow = 0.62 }) => {
  const { height: H } = useVideoConfig();
  const mask = `url("${src}")`;
  const towardFar = lightFrom === "right" ? "to left" : "to right";
  return (
    <Placed box={box} el="subject" t={t} style={{ opacity: progress, translate: `0 ${(1 - progress) * H * 0.05}px` }}>
      <Img
        src={src}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          filter: `brightness(0.92) contrast(1.1) saturate(0.85) drop-shadow(0 ${H * 0.02}px ${H * 0.05}px #000000${alpha(0.7)})`,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          maskImage: mask,
          maskSize: "100% 100%",
          WebkitMaskImage: mask,
          WebkitMaskSize: "100% 100%",
          background: `linear-gradient(${towardFar}, ${accent}${alpha(0.28)} 0%, transparent 22%, transparent 55%, ${bg}${alpha(shadow)} 100%)`,
          mixBlendMode: "soft-light",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          maskImage: mask,
          maskSize: "100% 100%",
          WebkitMaskImage: mask,
          WebkitMaskSize: "100% 100%",
          background: `linear-gradient(to top, ${bg} 0%, ${bg}${alpha(0.8)} 8%, transparent 30%)`,
        }}
      />
    </Placed>
  );
};

/** A metallic word with a light sweep: the course's brand name. */
export const MetalText: React.FC<{
  text: string;
  font: string;
  size: number;
  ink: string;
  muted: string;
  progress: number;
  weight?: number;
  tint?: string; // replaces the silver with a coloured metal (gold, neon…)
}> = ({ text, font, size, ink, muted, progress, weight = 900, tint }) => {
  const frame = useCurrentFrame();
  const sweep = interpolate(frame, [34, 70], [-60, 160], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const top = tint ?? "#ffffff";
  const mid = tint ?? ink;
  return (
    <div
      style={{
        fontFamily: font,
        fontWeight: weight,
        fontSize: size,
        lineHeight: 0.95,
        letterSpacing: `${interpolate(progress, [0, 1], [0.25, 0.02])}em`,
        opacity: progress,
        textTransform: "uppercase",
        whiteSpace: "nowrap",
        backgroundImage: `linear-gradient(100deg, transparent ${sweep - 20}%, #ffffff ${sweep}%, transparent ${sweep + 20}%), linear-gradient(180deg, ${top} 0%, ${mid} 42%, ${tint ? `${tint}` : muted} 58%, ${top} 100%)`,
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
        color: "transparent",
        filter: `drop-shadow(0 ${size * 0.06}px ${size * 0.18}px #000000${alpha(0.55)})`,
      }}
    >
      {text}
    </div>
  );
};

export const Pill: React.FC<{ text: string; font: string; size: number; color: string; ink: string }> = ({
  text,
  font,
  size,
  color,
  ink,
}) => (
  <div
    style={{
      fontFamily: font,
      fontWeight: 800,
      fontSize: size,
      color: ink,
      background: color,
      padding: `${size * 0.22}px ${size * 0.7}px`,
      borderRadius: size * 2,
      boxShadow: `0 ${size * 0.2}px ${size * 0.8}px ${color}${alpha(0.5)}, inset 0 1px 0 #ffffff${alpha(0.35)}`,
      whiteSpace: "nowrap",
    }}
  >
    {text}
  </div>
);

/** The call-to-action button, with a light pulse in video. */
export const CtaButton: React.FC<{ text: string; font: string; size: number; color: string; ink: string; progress: number }> = ({
  text,
  font,
  size,
  color,
  ink,
  progress,
}) => {
  const frame = useCurrentFrame();
  const pulse = 1 + Math.sin(frame / 8) * 0.015 * progress;
  return (
    <div
      style={{
        fontFamily: font,
        fontWeight: 800,
        fontSize: size,
        color: ink,
        background: `linear-gradient(180deg, ${color}, ${color}dd)`,
        padding: `${size * 0.5}px ${size * 1.4}px`,
        borderRadius: size * 2,
        boxShadow: `0 ${size * 0.3}px ${size * 1.4}px ${color}${alpha(0.55)}, inset 0 2px 0 #ffffff${alpha(0.35)}`,
        transform: `scale(${pulse * interpolate(progress, [0, 1], [0.8, 1])})`,
        opacity: progress,
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </div>
  );
};

/** Readable ink on a colour: dark or light, whichever contrasts more. */
export function inkOn(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 0.4 ? "#0b0b12" : "#ffffff";
}
