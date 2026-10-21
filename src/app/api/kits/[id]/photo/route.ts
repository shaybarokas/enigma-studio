import { NextResponse } from "next/server";
import sharp from "sharp";
import { cutout, storeUpload } from "@/lib/agent/assets";
import { getUserAndClient, type KitConcept } from "@/lib/kits";

export const maxDuration = 120;

// The lecturer's photo: stored, cut out, and placed into every concept that already exists.
export async function POST(req: Request, ctx: RouteContext<"/api/kits/[id]/photo">) {
  const { id } = await ctx.params;
  const { supabase, user } = await getUserAndClient();
  if (!user) return NextResponse.json({ error: "צריך להתחבר" }, { status: 401 });
  const { data: kit } = await supabase.from("kits").select("concepts, design").eq("id", id).maybeSingle();
  if (!kit) return NextResponse.json({ error: "הערכה לא נמצאה" }, { status: 404 });

  const file = (await req.formData()).get("photo");
  if (!(file instanceof File) || !file.type.startsWith("image/")) return NextResponse.json({ error: "צריך לבחור תמונה" }, { status: 400 });
  if (file.size > 20 * 1024 * 1024) return NextResponse.json({ error: "התמונה גדולה מדי (עד 20MB)" }, { status: 400 });

  try {
    // Normalised to a JPEG (also handles iPhone HEIC where supported) at a sane size.
    const jpg = await sharp(Buffer.from(await file.arrayBuffer()))
      .rotate()
      .resize(2400, 2400, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 92 })
      .toBuffer();
    const stamp = Date.now();
    const original = await storeUpload(`${user.id}/${id}/lecturer-${stamp}.jpg`, jpg, "image/jpeg");
    const subject = await cutout(original, "person", `${user.id}/${id}/lecturer-${stamp}.png`);

    const concepts = (kit.concepts as KitConcept[] | null)?.map((c) => ({
      ...c,
      design: { ...c.design, assets: { ...c.design.assets, subject } },
    }));
    const design = kit.design ? { ...kit.design, assets: { ...kit.design.assets, subject } } : null;
    await supabase.from("kits").update({ subject, concepts, design }).eq("id", id);
    return NextResponse.json({ subject });
  } catch (e) {
    console.error("[photo]", e);
    return NextResponse.json({ error: "לא הצלחנו לעבד את התמונה. נסו תמונה אחרת." }, { status: 502 });
  }
}
