import { NextResponse } from "next/server";
import { designSchema } from "@/engine/design";
import { getUserAndClient } from "@/lib/kits";

// Saves the user's edits to the chosen design (autosaved by the editor).
export async function PUT(req: Request, ctx: RouteContext<"/api/kits/[id]/design">) {
  const { id } = await ctx.params;
  const parsed = designSchema.safeParse((await req.json())?.design);
  if (!parsed.success) return NextResponse.json({ error: "העיצוב לא תקין" }, { status: 400 });
  const { supabase, user } = await getUserAndClient();
  if (!user) return NextResponse.json({ error: "צריך להתחבר" }, { status: 401 });
  const { error } = await supabase.from("kits").update({ design: parsed.data }).eq("id", id).not("design", "is", null);
  if (error) return NextResponse.json({ error: "השמירה נכשלה" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
