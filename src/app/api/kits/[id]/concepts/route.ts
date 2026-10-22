import { NextResponse } from "next/server";
import { buildConceptAssets } from "@/lib/agent/assets";
import type { Brief } from "@/lib/agent/brief";
import { createConcepts } from "@/lib/agent/concepts";
import { conceptToDesign } from "@/lib/agent/to-design";
import { NOT_ENOUGH, refund, spend } from "@/lib/credits";
import { getUserAndClient, type KitConcept } from "@/lib/kits";
import { COST } from "@/lib/plans";
import { alertOwner } from "@/lib/alert";

export const maxDuration = 300;

// Three creative directions from the brief, each with its AI scenes and props generated.
export async function POST(_req: Request, ctx: RouteContext<"/api/kits/[id]/concepts">) {
  const { id } = await ctx.params;
  const { supabase, user } = await getUserAndClient();
  if (!user) return NextResponse.json({ error: "צריך להתחבר" }, { status: 401 });
  const { data: kit } = await supabase.from("kits").select("brief, subject").eq("id", id).maybeSingle();
  if (!kit?.brief) return NextResponse.json({ error: "צריך קודם לספר לסוכן על ההשקה" }, { status: 400 });
  const brief = kit.brief as Brief;
  if (!(await spend(user.id, COST.concepts, "concepts", id))) return NextResponse.json({ error: NOT_ENOUGH, code: "credits" }, { status: 402 });

  try {
    const concepts = await createConcepts(brief);
    const built: KitConcept[] = await Promise.all(
      concepts.map(async (concept, i) => {
        const assets = await buildConceptAssets(concept, `${user.id}/${id}`, i, kit.subject ?? undefined);
        return { concept, design: conceptToDesign(concept, assets, { price: brief.price }) };
      }),
    );
    await supabase.from("kits").update({ concepts: built, status: "concepts", chosen: null }).eq("id", id);
    return NextResponse.json({ concepts: built });
  } catch (e) {
    await alertOwner("concepts:failed", "יצירת כיוונים נכשלה (הקרדיטים הוחזרו ללקוח)", { kit: id, error: (e as Error).message });
    await refund(user.id, COST.concepts, id);
    return NextResponse.json({ error: "לא הצלחנו לבנות את הכיוונים. נסו שוב." }, { status: 502 });
  }
}
