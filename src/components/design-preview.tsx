"use client";

// Live previews of a design in the browser: a still (last frame) for galleries and a looping player
// for the full-screen view. Same components as the server renders, so what you see is what you get.
import { Player, Thumbnail } from "@remotion/player";
import type { DesignProps } from "@/engine/design";
import { FORMATS, type FormatId } from "@/engine/formats";
import { TEMPLATES, type TemplateId } from "@/engine/templates";

const FPS = 30;
const DURATION = 90;

export function DesignThumb({
  design,
  template,
  format,
  className,
}: {
  design: DesignProps;
  template: TemplateId;
  format: FormatId;
  className?: string;
}) {
  const f = FORMATS[format];
  // The player positions its scaled canvas with left offsets; in an RTL page that throws it off-screen.
  return (
    <div dir="ltr" className={className}>
      <Thumbnail
        component={TEMPLATES[template].component}
        inputProps={design}
        compositionWidth={f.width}
        compositionHeight={f.height}
        durationInFrames={DURATION}
        fps={FPS}
        frameToDisplay={DURATION - 1}
        style={{
          width: "100%",
          aspectRatio: `${f.width} / ${f.height}`,
          display: "block",
        }}
      />
    </div>
  );
}

export function DesignPlayer({
  design,
  template,
  format,
}: {
  design: DesignProps;
  template: TemplateId;
  format: FormatId;
}) {
  const f = FORMATS[format];
  return (
    <div dir="ltr">
      <Player
        component={TEMPLATES[template].component}
        inputProps={design}
        compositionWidth={f.width}
        compositionHeight={f.height}
        durationInFrames={DURATION}
        fps={FPS}
        autoPlay
        loop
        controls
        style={{
          width: "100%",
          aspectRatio: `${f.width} / ${f.height}`,
          borderRadius: 16,
          overflow: "hidden",
        }}
      />
    </div>
  );
}
