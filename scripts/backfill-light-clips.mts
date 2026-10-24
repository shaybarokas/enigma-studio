// One-time: short cuts of the course footage for videos rendered before light-clips existed, so their
// preview in the video editor plays in any browser. Cuts here with the renderer's local ffmpeg; the
// rendered MP4s are unchanged. npx tsx --env-file=.env.local scripts/backfill-light-clips.mts
import { execFile } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { createClient } from "@supabase/supabase-js";
import { videoSchema } from "../src/engine/video/schema";
import { cutArgs, lightenClips } from "../src/lib/video/light-clips";

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!);
const dir = path.resolve(`node_modules/@remotion/compositor-${process.platform}-${process.arch}`);
const run = promisify(execFile);
let n = 0;
const cut = async (src: string, from: number, seconds: number) => {
  const out = path.join(os.tmpdir(), `light-${process.pid}-${++n}.mp4`);
  await run(path.join(dir, "ffmpeg"), cutArgs(src, from, seconds, out), { env: { ...process.env, DYLD_LIBRARY_PATH: dir, LD_LIBRARY_PATH: dir } });
  const data = fs.readFileSync(out);
  fs.rmSync(out);
  return data;
};

const { data: videos, error } = await db.from("videos").select("id, kit_id, spec, kits(user_id)").eq("status", "ready").not("spec", "is", null);
if (error) throw error;
for (const v of videos) {
  const parsed = videoSchema.safeParse(v.spec);
  if (!parsed.success) continue;
  const moments = parsed.data.scenes.flatMap((s) => [s.clip, s.insert?.clip]).filter((c) => c && !c.from);
  if (!moments.length) continue;
  const userId = (v.kits as unknown as { user_id: string }).user_id;
  const spec = await lightenClips(parsed.data, `${userId}/${v.kit_id}/videos/${v.id}`, cut);
  const done = spec.scenes.flatMap((s) => [s.clip, s.insert?.clip]).filter((c) => c?.from).length;
  await db.from("videos").update({ spec }).eq("id", v.id);
  console.log(v.id, `${done}/${moments.length} moments cut`);
}
