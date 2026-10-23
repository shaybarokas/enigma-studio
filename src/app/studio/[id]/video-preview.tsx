"use client";

// The video editor's live preview: the same composition the cloud renders, played in the browser
// with every edit applied at once. Loaded on the client only (see design-preview-lazy).
import { Player, type PlayerRef } from "@remotion/player";
import type { Ref } from "react";
import { videoDuration, type VideoProps } from "@/engine/video/schema";
import { VideoComposition } from "@/engine/video/video";

export function VideoPreview({ spec, ref }: { spec: VideoProps; ref?: Ref<PlayerRef> }) {
  // The player positions its canvas with left offsets; in an RTL page that throws it off-screen.
  return (
    <div dir="ltr" className="overflow-hidden rounded-2xl">
      <Player
        ref={ref}
        component={VideoComposition}
        inputProps={spec}
        durationInFrames={Math.max(30, videoDuration(spec.scenes))}
        compositionWidth={1080}
        compositionHeight={1920}
        fps={30}
        controls
        style={{ width: "100%", aspectRatio: "9 / 16" }}
        acknowledgeRemotionLicense
      />
    </div>
  );
}
