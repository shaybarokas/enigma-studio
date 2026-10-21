import { NextResponse } from "next/server";
import { getUserAndClient, type KitConcept } from "@/lib/kits";

// Picks one of the three directions as the kit's design.
export async function POST(req: Request, ctx: RouteContext<"/api/kits/[id]/choose">) {
  const { id } = await ctx.params;
  const { index } = (await req.json()) as { index?: number };
  const { supabase, user } = await getUserAndClient();
  if (!user) return NextResponse.json({ error: "צריך להתחבר" }, { status: 401 });
  const { data: kit } = await supabase.from("kits").select("concepts").eq("id", id).maybeSingle();
  const concepts = kit?.concepts as KitConcept[] | null;
  if (!concepts || typeof index !== "number" || !concepts[index]) return NextResponse.json({ error: "כיוון לא קיים" }, { status: 400 });
  const design = concepts[index].design;
  await supabase.from("kits").update({ chosen: index, design, status: "ready" }).eq("id", id);
  return NextResponse.json({ design });
}
