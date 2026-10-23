// The video: the approved beats as shots, joined by hard cuts and moving transitions, narrated,
// captioned, scored (the music ducks under the voice and rises between lines) and sweetened with
// sound effects on the cuts, the reveal and the list.
import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { AbsoluteFill, Audio, interpolate, Sequence, useVideoConfig } from "remotion";
import type { CalculateMetadataFunction } from "remotion";
import type { TemplateId } from "../catalog";
import { fontFamily, useFontsReady, type FontName } from "../fonts";
import { Watermark } from "../watermark";
import { Captions } from "./captions";
import { sceneStarts, TRANSITION_FRAMES, videoDuration, type VideoProps } from "./schema";
import { captioned, listTimes, Shot } from "./shots";
import { PRESENTATIONS } from "./transitions";

const MUSIC_UNDER_VOICE = 0.11;
const MUSIC_OPEN = 0.3;

const Video: React.FC<VideoProps> = ({ kind, design, cover, scenes, music, captions, sfx, backdrops }) => {
  const { durationInFrames, fps } = useVideoConfig();
  const capFont = fontFamily(design.brand.headlineFont as FontName);
  const starts = sceneStarts(scenes);

  // Spoken spans in video frames: the music steps back under them.
  const speech = scenes.flatMap((s, i) => (s.words.length ? [[starts[i] + s.words[0].start * fps, starts[i] + s.words.at(-1)!.end * fps] as const] : []));
  const musicVolume = (f: number) => {
    const gap = speech.reduce((d, [a, b]) => Math.min(d, f < a ? a - f : f > b ? f - b : 0), Infinity);
    const bed = interpolate(gap, [0, 10], [MUSIC_UNDER_VOICE, MUSIC_OPEN], { extrapolateRight: "clamp" });
    const fadeIn = interpolate(f, [0, fps * 0.4], [0.4, 1], { extrapolateRight: "clamp" });
    const fadeOut = interpolate(f, [durationInFrames - fps * 1.5, durationInFrames - 1], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    return bed * fadeIn * fadeOut;
  };

  // Sound effects at their moments.
  const hits: { at: number; src: string; volume: number }[] = [];
  if (sfx) {
    scenes.forEach((s, i) => {
      const t = s.transition;
      if (i < scenes.length - 1 && (t === "whip" || t === "zoom")) hits.push({ at: starts[i + 1] - 4, src: sfx.whoosh, volume: 0.5 });
      if (s.role === "intro" || s.role === "cta") hits.push({ at: starts[i], src: sfx.impact, volume: 0.55 });
      if (s.role === "intro" && kind === "promo" && starts[i] > fps * 2) hits.push({ at: starts[i] - fps * 2, src: sfx.riser, volume: 0.4 });
      if (s.visual === "logo") hits.push({ at: starts[i] + 8, src: sfx.shimmer, volume: 0.4 });
      if (s.visual === "list" && s.role !== "cta") for (const f of listTimes(s, s.items.length || 3)) hits.push({ at: starts[i] + f, src: sfx.pop, volume: 0.35 });
    });
  }

  return (
    <AbsoluteFill style={{ background: design.brand.palette.bg }}>
      <TransitionSeries>
        {scenes.flatMap((scene, i) => {
          const seq = (
            <TransitionSeries.Sequence key={`s${i}`} durationInFrames={scene.durationInFrames}>
              <Shot scene={scene} design={design} kind={kind} cover={cover as TemplateId} backdrops={backdrops} />
              {captions !== "off" && captioned(scene) && <Captions scene={scene} style={captions} font={capFont} accent={design.brand.palette.accent} />}
              {scene.audio && (
                <Sequence from={scene.lead} layout="none">
                  <Audio src={scene.audio} />
                </Sequence>
              )}
            </TransitionSeries.Sequence>
          );
          if (i === scenes.length - 1 || scene.transition === "cut") return [seq];
          return [
            seq,
            <TransitionSeries.Transition
              key={`t${i}`}
              presentation={PRESENTATIONS[scene.transition]}
              timing={linearTiming({ durationInFrames: TRANSITION_FRAMES[scene.transition] })}
            />,
          ];
        })}
      </TransitionSeries>
      {hits.map((h, i) => (
        <Sequence key={i} from={Math.max(0, Math.round(h.at))} durationInFrames={fps * 3} layout="none">
          <Audio src={h.src} volume={h.volume} />
        </Sequence>
      ))}
      {design.watermark && <Watermark />}
      {music && <Audio src={music} volume={musicVolume} />}
    </AbsoluteFill>
  );
};

/** The video, drawn once the brand's fonts are loaded (titles and captions are measured with them). */
export const VideoComposition: React.FC<VideoProps> = (p) => {
  const b = p.design.brand;
  const ready = useFontsReady([b.displayFont, b.headlineFont, b.bodyFont] as FontName[]);
  return ready ? <Video {...p} /> : null;
};

export const calculateVideoMetadata: CalculateMetadataFunction<VideoProps> = ({ props }) => ({
  durationInFrames: videoDuration(props.scenes),
  fps: 30,
  width: 1080,
  height: 1920,
});
