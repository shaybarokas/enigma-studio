// Prints the reviewed narration for a kit: npx tsx --env-file=.env.local scripts/script-test.mts <kitId> <promo|marketing>
import { createAdminClient } from "../src/lib/supabase/admin";
import { writeVideoScript } from "../src/lib/video/script";
const [kitId, kind] = process.argv.slice(2);
const { data } = await createAdminClient().from("kits").select("brief, design").eq("id", kitId).single();
const s = await writeVideoScript(kind as "promo" | "marketing", data!.brief, data!.design);
for (const sc of s.scenes) console.log(sc.type.padEnd(8), sc.voice, " ←", sc.emphasis.join(","));
