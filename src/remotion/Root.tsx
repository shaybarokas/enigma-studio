import { Composition } from "remotion";
import { designSchema, type DesignProps } from "../engine/design";
import { FORMATS, FORMAT_IDS } from "../engine/formats";
import { TEMPLATES, TEMPLATE_IDS } from "../engine/templates";
import { calculateVideoMetadata, VideoComposition } from "../engine/video/video";
import { videoSchema } from "../engine/video/schema";
import { brickBoss, sampleVideo, swingWin } from "./samples";

const SAMPLES: Record<string, DesignProps> = { brick: brickBoss, swing: swingWin };

// "design-<template>-<format>" renders any design passed as inputProps (the app and scripts use these);
// "<sample>-<template>-<format>" are fixed samples for developing templates.
// Stills render the last frame; video uses all of it.
export const RemotionRoot: React.FC = () => (
  <>
    {/* Videos: length comes from the scenes (calculateMetadata). */}
    <Composition
      id="video"
      component={VideoComposition}
      schema={videoSchema}
      defaultProps={sampleVideo}
      calculateMetadata={calculateVideoMetadata}
      width={1080}
      height={1920}
      fps={30}
      durationInFrames={300}
    />
    {TEMPLATE_IDS.flatMap((t) =>
      FORMAT_IDS.map((f) => (
        <Composition
          key={`design-${t}-${f}`}
          id={`design-${t}-${f}`}
          component={TEMPLATES[t].component}
          schema={designSchema}
          defaultProps={brickBoss}
          width={FORMATS[f].width}
          height={FORMATS[f].height}
          fps={30}
          durationInFrames={90}
        />
      )),
    )}
    {Object.entries(SAMPLES).flatMap(([sample, props]) =>
      TEMPLATE_IDS.flatMap((t) =>
        FORMAT_IDS.map((f) => (
          <Composition
            key={`${sample}-${t}-${f}`}
            id={`${sample}-${t}-${f}`}
            component={TEMPLATES[t].component}
            schema={designSchema}
            defaultProps={props}
            width={FORMATS[f].width}
            height={FORMATS[f].height}
            fps={30}
            durationInFrames={90}
          />
        )),
      ),
    )}
  </>
);
