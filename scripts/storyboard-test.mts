// Writes a storyboard of each kind for a kit and prints its length: npx tsx --env-file=.env.local scripts/storyboard-test.mts <kitId>
import { createClient } from "@supabase/supabase-js";
import { estimateSeconds, writeStoryboard } from "../src/lib/video/storyboard";

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!);
const { data: kit } = await db.from("kits").select("brief, design, media, clips").eq("id", process.argv[2]).single();
await Promise.all(
  (["promo", "marketing"] as const).map(async (kind) => {
    const t = Date.now();
    const sb = await writeStoryboard(kind, "or", { brief: kit!.brief, design: kit!.design, media: kit!.media ?? [], clips: kit!.clips ?? [] });
    console.log(`\n== ${kind}: ${estimateSeconds(sb)}s, ${sb.beats.length} beats, ${Math.round((Date.now() - t) / 1000)}s to write · music: ${sb.musicMood}`);
    for (const b of sb.beats) console.log(`[${b.role}/${b.visual}] ${b.voice}  ⟶  ${b.title}${b.sub ? ` / ${b.sub}` : ""}${b.items.length ? ` • ${b.items.join(" • ")}` : ""}`);
  }),
);
