// Prepares a video (voice, stills, edit, music) without the cloud render, and writes its spec for local
// renders: npx tsx --env-file=.env.local scripts/video-lab.mts <videoId | kit:<kitId>:<promo|marketing>> <out.json>
// A "kit:" source writes a new storyboard first (printed, and saved next to the spec).
import { writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import type { DesignProps } from "../src/engine/design";
import type { KitConcept } from "../src/lib/kits";
import { prepareVideo } from "../src/lib/video/prepare";
import { estimateSeconds, writeStoryboard, type Storyboard } from "../src/lib/video/storyboard";
import type { Brief } from "../src/lib/agent/brief";
import type { Media } from "../src/lib/agent/media";
import type { VoiceKey } from "../src/lib/video/voices";

const [source, out] = process.argv.slice(2);
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!);
let kitId: string;
let userId: string;
let storyboard: Storyboard;
if (source.startsWith("kit:")) {
  const [, id, kind] = source.split(":");
  const { data: k } = await db.from("kits").select("user_id, brief, design, media").eq("id", id).single();
  storyboard = await writeStoryboard(kind as Storyboard["kind"], "or", k!.brief as Brief, k!.design as DesignProps, (k!.media as Media[]) ?? []);
  writeFileSync(out.replace(/\.json$/, "-storyboard.json"), JSON.stringify(storyboard, null, 2));
  console.log(`storyboard: ~${estimateSeconds(storyboard)}s, ${storyboard.beats.length} beats`);
  for (const b of storyboard.beats) console.log(`  [${b.role}/${b.visual}] ${b.voice}${b.shot ? `  🎥 ${b.shot}` : ""}`);
  [kitId, userId] = [id, k!.user_id];
} else {
  const { data: video } = await db.from("videos").select("kit_id, user_id, storyboard").eq("id", source).single();
  [kitId, userId, storyboard] = [video!.kit_id, video!.user_id, video!.storyboard as Storyboard];
}
const { data: kit } = await db.from("kits").select("design, concepts, chosen").eq("id", kitId).single();
const concept = (kit!.concepts as KitConcept[])[kit!.chosen].concept;
const t = Date.now();
const spec = await prepareVideo({
  videoId: `lab-${t.toString(36)}`,
  userId,
  kitId,
  storyboard,
  voice: storyboard.voice as VoiceKey,
  design: kit!.design as DesignProps,
  cover: concept.templateId,
  style: concept.backgroundPrompt,
});
writeFileSync(out, JSON.stringify(spec));
console.log(`${out}: ${spec.scenes.length} scenes, ${Math.round((Date.now() - t) / 1000)}s`);
for (const s of spec.scenes) console.log(`${s.role}/${s.visual} ${s.durationInFrames}f cut=${s.cut ?? "-"} → ${s.transition}${s.image ? " [own still]" : ""}`);
