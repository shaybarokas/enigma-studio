// The free plan's mark: small, legible, out of the way, inside every platform's safe area.
import { AbsoluteFill, useVideoConfig } from "remotion";
import { formatFromSize, STORY_SAFE } from "./formats";

export const Watermark: React.FC = () => {
  const { width: W, height: H } = useVideoConfig();
  const story = formatFromSize(W, H) === "story";
  const size = Math.round(Math.min(W, H) * 0.024);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          left: W * 0.03,
          bottom: story ? H * (STORY_SAFE.bottom + 0.01) : H * 0.03,
          padding: `${size * 0.45}px ${size * 0.9}px`,
          borderRadius: size * 2,
          background: "rgba(0,0,0,0.55)",
          color: "#ffffff",
          fontFamily: "system-ui, sans-serif",
          fontSize: size,
          fontWeight: 700,
          direction: "rtl",
          letterSpacing: "0.02em",
          border: "1px solid rgba(255,255,255,0.25)",
        }}
      >
        נוצר ב־<span dir="ltr">Enigma Studio</span>
      </div>
    </AbsoluteFill>
  );
};
