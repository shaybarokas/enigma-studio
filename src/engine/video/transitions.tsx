// The moving transitions between beats. Each is short (8–14 frames) and carries motion blur, the
// way an editor hides a cut inside a camera move: a whip pan, a punch-in, a flash of light, a fade.
import type { TransitionPresentation, TransitionPresentationComponentProps } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { AbsoluteFill, interpolate } from "remotion";
import type { TransitionKind } from "./schema";

type P = Record<string, unknown>;
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

// The outgoing picture whips off to the side (RTL: toward the left), the next one comes in behind it.
const Whip: React.FC<TransitionPresentationComponentProps<P>> = ({ children, presentationDirection, presentationProgress }) => {
  const p = ease(presentationProgress);
  const exiting = presentationDirection === "exiting";
  const x = exiting ? -p * 100 : (1 - p) * 100;
  const blur = Math.sin(p * Math.PI) * 28;
  return <AbsoluteFill style={{ transform: `translateX(${x}%)`, filter: blur > 0.5 ? `blur(${blur}px)` : undefined }}>{children}</AbsoluteFill>;
};

// The camera punches into the outgoing picture, and the next one lands from slightly too close.
const Zoom: React.FC<TransitionPresentationComponentProps<P>> = ({ children, presentationDirection, presentationProgress }) => {
  const p = ease(presentationProgress);
  const exiting = presentationDirection === "exiting";
  const scale = exiting ? interpolate(p, [0, 1], [1, 1.6]) : interpolate(p, [0, 1], [1.35, 1]);
  const blur = Math.sin(p * Math.PI) * 16;
  return (
    <AbsoluteFill style={{ transform: `scale(${scale})`, opacity: exiting ? 1 - p : Math.min(1, p * 2), filter: blur > 0.5 ? `blur(${blur}px)` : undefined }}>
      {children}
    </AbsoluteFill>
  );
};

// A burst of white light: the reveal of the course.
const Flash: React.FC<TransitionPresentationComponentProps<P>> = ({ children, presentationDirection, presentationProgress }) => {
  const exiting = presentationDirection === "exiting";
  const light = Math.sin(presentationProgress * Math.PI);
  return (
    <AbsoluteFill style={{ opacity: exiting ? (presentationProgress < 0.5 ? 1 : 0) : presentationProgress < 0.5 ? 0 : 1 }}>
      {children}
      <AbsoluteFill style={{ background: "#ffffff", opacity: light, mixBlendMode: "screen" }} />
    </AbsoluteFill>
  );
};

const own = (component: React.FC<TransitionPresentationComponentProps<P>>): TransitionPresentation<P> => ({ component, props: {} });

export const PRESENTATIONS: Record<Exclude<TransitionKind, "cut">, TransitionPresentation<P>> = {
  whip: own(Whip),
  zoom: own(Zoom),
  flash: own(Flash),
  fade: fade() as TransitionPresentation<P>,
};
