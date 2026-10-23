// Produces a video end to end: the approved storyboard prepared (./prepare), rendered in the cloud
// and stored as an MP4. Progress is written to the videos row so the studio can show it.
import { renderMediaOnVercel } from "@remotion/vercel";
import { alertOwner } from "../alert";
import { refund } from "../credits";
import { COST } from "../plans";
import { renderSandbox } from "../render/sandbox";
import { createAdminClient } from "../supabase/admin";
import { prepareVideo, type Production } from "./prepare";

export async function produceVideo(opts: Production) {
  const db = createAdminClient();
  const set = (patch: Record<string, unknown>) =>
    db.from("videos").update(patch).eq("id", opts.videoId);
  const folder = `${opts.userId}/${opts.kitId}/videos/${opts.videoId}`;

  try {
    const spec = await prepareVideo(opts, (status) => set({ status }));
    // AI clips that couldn't be made play as their stills; their credits go back now.
    const missing = opts.storyboard.beats.filter((b) => b.visual === "scene" && b.motion).length - spec.scenes.filter((x) => x.motion).length;
    if (missing > 0 && opts.cost) {
      await refund(opts.userId, missing * COST.motion, opts.videoId);
      opts = { ...opts, cost: opts.cost - missing * COST.motion };
    }
    await set({ status: "rendering", spec });

    const sandbox = await renderSandbox();
    try {
      const { sandboxFilePath } = await renderMediaOnVercel({
        sandbox,
        compositionId: "video",
        inputProps: spec as unknown as Record<string, unknown>,
        codec: "h264",
        concurrency: 8, // one tab per vCPU of the sandbox
        crf: 20,
        timeoutInMilliseconds: 600_000,
      });
      const data = await sandbox.readFileToBuffer({ path: sandboxFilePath });
      if (!data) throw new Error("render produced no file");
      const path = `${folder}/${opts.storyboard.kind}.mp4`;
      const { error } = await db.storage
        .from("kit-assets")
        .upload(path, data, { contentType: "video/mp4", upsert: true });
      if (error) throw new Error(`storage: ${error.message}`);
      const url = db.storage.from("kit-assets").getPublicUrl(path)
        .data.publicUrl;
      await set({ status: "ready", url });
    } finally {
      await sandbox.stop().catch(() => {});
    }
  } catch (e) {
    await alertOwner(
      "video:failed",
      "הפקת סרטון נכשלה (הקרדיטים הוחזרו ללקוח)",
      { video: opts.videoId, kit: opts.kitId, error: (e as Error).message },
    );
    if (opts.cost) await refund(opts.userId, opts.cost, opts.videoId);
    // The free plan's one sample video: a failed one doesn't count.
    else
      await db
        .from("accounts")
        .update({ free_video_used: false })
        .eq("user_id", opts.userId);
    await set({
      status: "failed",
      error: String((e as Error).message ?? e).slice(0, 500),
    });
  }
}
