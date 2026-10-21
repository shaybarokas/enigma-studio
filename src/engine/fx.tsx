// Finishing layers shared by templates: grain, vignette, glow. Pure CSS/SVG so stills and video match.
import { AbsoluteFill, useCurrentFrame } from "remotion";

export const Grain: React.FC<{ opacity?: number }> = ({ opacity = 0.13 }) => {
  // A new seed every 2 frames makes the grain "live" in video and stays fixed in stills.
  const seed = Math.floor(useCurrentFrame() / 2) % 8;
  return (
    <AbsoluteFill style={{ opacity, mixBlendMode: "overlay", pointerEvents: "none" }}>
      <svg width="100%" height="100%" preserveAspectRatio="none">
        <filter id={`grain-${seed}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" seed={seed} stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#grain-${seed})`} />
      </svg>
    </AbsoluteFill>
  );
};

export const Vignette: React.FC<{ strength?: number; color?: string }> = ({ strength = 0.55, color = "#000000" }) => (
  <AbsoluteFill
    style={{
      pointerEvents: "none",
      background: `radial-gradient(ellipse at 50% 45%, transparent 45%, ${color}${alpha(strength)} 100%)`,
    }}
  />
);

/** Soft light behind a subject, the "rim light" look of studio posters. */
export const Glow: React.FC<{ x: number; y: number; size: number; color: string; opacity?: number }> = ({
  x,
  y,
  size,
  color,
  opacity = 0.55,
}) => (
  <div
    style={{
      position: "absolute",
      left: x - size / 2,
      top: y - size / 2,
      width: size,
      height: size,
      borderRadius: "50%",
      background: `radial-gradient(circle, ${color} 0%, transparent 65%)`,
      opacity,
      filter: `blur(${size * 0.08}px)`,
    }}
  />
);

/** #rrggbb + 0..1 → two hex digits of alpha. */
export function alpha(a: number): string {
  return Math.round(Math.max(0, Math.min(1, a)) * 255)
    .toString(16)
    .padStart(2, "0");
}
