import { Composition } from "remotion";
import { FORMATS, FORMAT_IDS } from "../engine/formats";
import { CinematicPoster, cinematicPosterSchema } from "../engine/templates/cinematic-poster";
import { brickBoss } from "./samples";

// One composition per template × format. Stills render the last frame; video uses all of it.
export const RemotionRoot: React.FC = () => (
  <>
    {FORMAT_IDS.map((f) => (
      <Composition
        key={f}
        id={`cinematic-poster-${f}`}
        component={CinematicPoster}
        schema={cinematicPosterSchema}
        defaultProps={brickBoss}
        width={FORMATS[f].width}
        height={FORMATS[f].height}
        fps={30}
        durationInFrames={90}
      />
    ))}
  </>
);
