import { NextResponse } from "next/server";
import { designSchema, type DesignProps } from "@/engine/design";
import { getUserAndClient } from "@/lib/kits";

// Saves the user's edits to the chosen design (autosaved by the editor).
export async function PUT(req: Request, ctx: RouteContext<"/api/kits/[id]/design">) {
  const { id } = await ctx.params;
  const parsed = designSchema.safeParse((await req.json())?.design);
  if (!parsed.success) return NextResponse.json({ error: "העיצוב לא תקין" }, { status: 400 });
  const { supabase, user } = await getUserAndClient();
  if (!user) return NextResponse.json({ error: "צריך להתחבר" }, { status: 401 });
  // The tall scene may have landed while the editor was open: an edit made before it keeps it.
  const { data: now } = await supabase.from("kits").select("design").eq("id", id).maybeSingle();
  const saved = now?.design as DesignProps | null;
  const design =
    saved?.assets.backgroundTall && !parsed.data.assets.backgroundTall && saved.assets.background === parsed.data.assets.background
      ? { ...parsed.data, assets: { ...parsed.data.assets, backgroundTall: saved.assets.backgroundTall } }
      : parsed.data;
  const { error } = await supabase.from("kits").update({ design }).eq("id", id).not("design", "is", null);
  if (error) return NextResponse.json({ error: "השמירה נכשלה" }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// The chosen design's tall scene, for the studio to pick up once it is painted (see ../choose).
export async function GET(_req: Request, ctx: RouteContext<"/api/kits/[id]/design">) {
  const { id } = await ctx.params;
  const { supabase, user } = await getUserAndClient();
  if (!user) return NextResponse.json({ error: "צריך להתחבר" }, { status: 401 });
  const { data } = await supabase.from("kits").select("design").eq("id", id).maybeSingle();
  const design = data?.design as DesignProps | null;
  return NextResponse.json({ background: design?.assets.background ?? null, backgroundTall: design?.assets.backgroundTall ?? null });
}
