import { Composition } from "remotion";
import { designSchema, type DesignProps } from "../engine/design";
import { FORMATS, FORMAT_IDS } from "../engine/formats";
import { TEMPLATES, TEMPLATE_IDS } from "../engine/templates";
import { brickBoss, swingWin } from "./samples";

const SAMPLES: Record<string, DesignProps> = { brick: brickBoss, swing: swingWin };

// One composition per sample × template × format, e.g. "brick-cinematic-poster-story".
// Stills render the last frame; video uses all of it.
export const RemotionRoot: React.FC = () => (
  <>
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
