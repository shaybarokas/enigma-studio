// One-time: icons for the list items of kits made before icons existed (the design and every concept's
// design): npx tsx --env-file=.env.local scripts/backfill-icons.mts
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { DesignProps } from "../src/engine/design";
import { ICON_KEYS } from "../src/engine/icon-keys";
import { structured } from "../src/lib/ai/claude";
import type { KitConcept } from "../src/lib/kits";

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!);
const schema = z.object({ lists: z.array(z.array(z.enum(ICON_KEYS))).describe("for each list, one icon per item, in order") });

async function iconsFor(lists: string[][]) {
  const out = await structured({
    schema,
    effort: "low",
    maxTokens: 2000,
    system: "For each list of course outcomes (Hebrew), choose the icon key that best shows each item.",
    messages: [{ role: "user", content: JSON.stringify(lists) }],
  });
  return out.lists;
}

const { data: kits } = await db.from("kits").select("id, design, concepts").not("design", "is", null);
let n = 0;
for (const k of kits ?? []) {
  const design = k.design as DesignProps;
  const concepts = (k.concepts as KitConcept[] | null) ?? [];
  const designs = [design, ...concepts.map((c) => c.design)];
  const missing = designs.filter((d) => d.copy.bullets.length && (d.copy.icons ?? []).length !== d.copy.bullets.length);
  if (!missing.length) continue;
  const picked = await iconsFor(missing.map((d) => d.copy.bullets));
  missing.forEach((d, i) => (d.copy.icons = (picked[i] ?? []).slice(0, d.copy.bullets.length)));
  await db.from("kits").update({ design, concepts: concepts.length ? concepts : null }).eq("id", k.id);
  n++;
  console.log(k.id.slice(0, 8), design.copy.bullets.map((b, i) => `${design.copy.icons[i]}:${b}`).join(" | "));
}
console.log(`${n} kits updated`);
