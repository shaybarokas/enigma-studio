"use client";

// Live previews of a design in the browser: a still (last frame) for galleries and a looping player
// for the full-screen view. Same components as the server renders, so what you see is what you get.
import { Player, Thumbnail } from "@remotion/player";
import { forView, type DesignProps } from "@/engine/design";
import { FORMATS, type FormatId } from "@/engine/formats";
import { TEMPLATES, type TemplateId } from "@/engine/templates";

const FPS = 30;

// Previews load resized copies of the kit's images from Supabase (a 900KB cut-out becomes ~30KB);
// downloads always render from the originals.
function resized(url: string | undefined, width: number) {
  if (!url || !url.includes("/storage/v1/object/public/")) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url.replace("/storage/v1/object/public/", "/storage/v1/render/image/public/")}${sep}width=${width}&resize=contain&quality=80`;
}

function forPreview(design: DesignProps, scale: number): DesignProps {
  const a = design.assets;
  return {
    ...design,
    assets: {
      ...a,
      background: resized(a.background, Math.round(2000 * scale))!,
      backgroundTall: resized(a.backgroundTall, Math.round(1200 * scale)),
      subject: a.subject && { ...a.subject, src: resized(a.subject.src, Math.round(1200 * scale))! },
      props: a.props.map((p) => ({ ...p, src: resized(p.src, Math.round(700 * scale))! })),
    },
  };
}
const DURATION = 90;
const PREVIEW_SCALE = 0.5; // gallery thumbnails are at most ~600px wide

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
        inputProps={forView(forPreview(design, PREVIEW_SCALE), template, format)}
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
        inputProps={forView(forPreview(design, 1), template, format)}
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
