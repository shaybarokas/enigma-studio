import { NextResponse } from "next/server";
import { getUserAndClient } from "@/lib/kits";
import { createAdminClient } from "@/lib/supabase/admin";

// The kit's name, as the user calls it in their list.
export async function PATCH(req: Request, ctx: RouteContext<"/api/kits/[id]">) {
  const { id } = await ctx.params;
  const { supabase, user } = await getUserAndClient();
  if (!user) return NextResponse.json({ error: "צריך להתחבר" }, { status: 401 });
  const { title } = (await req.json().catch(() => ({}))) as { title?: string };
  const name = (title ?? "").trim().slice(0, 80);
  if (!name) return NextResponse.json({ error: "צריך שם" }, { status: 400 });
  const { data } = await supabase.from("kits").update({ title: name }).eq("id", id).select("id").maybeSingle();
  if (!data) return NextResponse.json({ error: "הערכה לא נמצאה" }, { status: 404 });
  return NextResponse.json({ title: name });
}

// Deletes the kit for good: its videos (by cascade) and every file it holds. Not while a video of
// it is being produced, whose files would land after the cleanup.
export async function DELETE(_req: Request, ctx: RouteContext<"/api/kits/[id]">) {
  const { id } = await ctx.params;
  const { supabase, user } = await getUserAndClient();
  if (!user) return NextResponse.json({ error: "צריך להתחבר" }, { status: 401 });
  const { data: kit } = await supabase.from("kits").select("id").eq("id", id).maybeSingle();
  if (!kit) return NextResponse.json({ error: "הערכה לא נמצאה" }, { status: 404 });
  const { count } = await supabase.from("videos").select("id", { count: "exact", head: true }).eq("kit_id", id).not("status", "in", "(draft,ready,failed)");
  if (count) return NextResponse.json({ error: "סרטון של הערכה בהפקה עכשיו. אפשר למחוק כשיסתיים." }, { status: 409 });

  const storage = createAdminClient().storage.from("kit-assets");
  const files: string[] = [];
  const walk = async (folder: string) => {
    for (let offset = 0; ; offset += 1000) {
      const { data } = await storage.list(folder, { limit: 1000, offset });
      if (!data?.length) break;
      for (const f of data) {
        if (f.id) files.push(`${folder}/${f.name}`);
        else await walk(`${folder}/${f.name}`); // a folder
      }
      if (data.length < 1000) break;
    }
  };
  await walk(`${user.id}/${id}`);
  for (let i = 0; i < files.length; i += 500) await storage.remove(files.slice(i, i + 500));

  const { error } = await supabase.from("kits").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "המחיקה נכשלה" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
