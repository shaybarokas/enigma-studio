// Produces a video end to end: the approved storyboard prepared (./prepare), rendered in the cloud
// and stored as an MP4. Progress is written to the videos row so the studio can show it.
import { renderMediaOnVercel } from "@remotion/vercel";
import { alertOwner } from "../alert";
import { refund } from "../credits";
import { COST } from "../plans";
import { releaseSandbox, renderSandbox } from "../render/sandbox";
import { createAdminClient } from "../supabase/admin";
import type { VideoProps } from "@/engine/video/schema";
import { prepareVideo, type Production } from "./prepare";
import { cutArgs, lightenClips, type Cutter } from "./light-clips";
import { notifyVideo } from "./notify";
import type { Sandbox } from "@vercel/sandbox";

/** Renders a spec in the cloud and stores the MP4. The course footage it uses is cut into short
 * files first (./light-clips); returns the URL and the spec as rendered, which the row keeps. */
export async function renderToStorage(
  input: VideoProps,
  path: string,
): Promise<{ url: string; spec: VideoProps }> {
  const db = createAdminClient();
  const sandbox = await renderSandbox();
  try {
    const spec = await lightenClips(input, path.slice(0, path.lastIndexOf("/")), sandboxCutter(sandbox));
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
    const { error } = await db.storage
      .from("kit-assets")
      .upload(path, data, { contentType: "video/mp4", upsert: true });
    if (error) throw new Error(`storage: ${error.message}`);
    return { url: db.storage.from("kit-assets").getPublicUrl(path).data.publicUrl, spec };
  } finally {
    await releaseSandbox(sandbox);
  }
}

// The renderer's own ffmpeg, already in the sandbox (its libraries sit next to it). It reads local
// files only (no https), so each lesson is downloaded once, then every moment is cut from it.
const FFMPEG_DIR = "node_modules/@remotion/compositor-linux-x64-gnu";
function sandboxCutter(sandbox: Sandbox): Cutter {
  const run = async (script: string, args: string[]) => {
    const cmd = await sandbox.runCommand({ cmd: "bash", args: ["-c", script, "sh", ...args], detached: true });
    const done = await cmd.wait();
    if (done.exitCode !== 0) throw new Error(`exit ${done.exitCode}: ${(await done.stderr()).slice(0, 300)}`);
  };
  const files = new Map<string, Promise<string>>();
  const local = (src: string) => {
    if (!files.has(src)) {
      const file = `/tmp/lesson-${files.size + 1}`;
      files.set(src, run('curl -sSfL --retry 2 -o "$1" "$2"', [file, src]).then(() => file));
    }
    return files.get(src)!;
  };
  let cuts = 0;
  return async (src, from, seconds) => {
    const out = `/tmp/cut-${++cuts}.mp4`;
    await run(`dir=$(readlink -f ${FFMPEG_DIR}) && LD_LIBRARY_PATH=$dir "$dir/ffmpeg" "$@"`, cutArgs(await local(src), from, seconds, out));
    const data = await sandbox.readFileToBuffer({ path: out });
    if (!data) throw new Error("ffmpeg wrote nothing");
    return data;
  };
}

export async function produceVideo(opts: Production) {
  const db = createAdminClient();
  const set = (patch: Record<string, unknown>) =>
    db.from("videos").update(patch).eq("id", opts.videoId);
  const folder = `${opts.userId}/${opts.kitId}/videos/${opts.videoId}`;

  try {
    const spec = await prepareVideo(opts, (status) => set({ status }));
    // AI clips that couldn't be made play as their stills; their credits go back now.
    const missing =
      opts.storyboard.beats.filter((b) => b.visual === "scene" && b.motion)
        .length - spec.scenes.filter((x) => x.motion).length;
    if (missing > 0 && opts.cost) {
      await refund(opts.userId, missing * COST.motion, opts.videoId);
      opts = { ...opts, cost: opts.cost - missing * COST.motion };
    }
    await set({ status: "rendering", spec });

    await set({ status: "ready", ...(await renderToStorage(spec, `${folder}/${opts.storyboard.kind}.mp4`)) });
    await notifyVideo({ userId: opts.userId, kitId: opts.kitId, kind: opts.storyboard.kind });
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
    await notifyVideo({ userId: opts.userId, kitId: opts.kitId, kind: opts.storyboard.kind, failed: { credits: opts.cost } });
  }
}
