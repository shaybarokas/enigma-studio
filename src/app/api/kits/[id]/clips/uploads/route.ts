import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getUserAndClient } from "@/lib/kits";
import { createAdminClient } from "@/lib/supabase/admin";
import { CLIP_EXT, MAX_THUMBS } from "@/lib/video/clip-files";

// One-time upload links for a course clip and the frames the browser took from it. The video goes
// straight to storage (far over what a function may receive); /clips then analyses it.
export async function POST(req: Request, ctx: RouteContext<"/api/kits/[id]/clips/uploads">) {
  const { id } = await ctx.params;
  const { supabase, user } = await getUserAndClient();
  if (!user) return NextResponse.json({ error: "צריך להתחבר" }, { status: 401 });
  const { data: kit } = await supabase.from("kits").select("id").eq("id", id).maybeSingle();
  if (!kit) return NextResponse.json({ error: "הערכה לא נמצאה" }, { status: 404 });
  const { type, thumbs, clipId } = (await req.json()) as { type?: string; thumbs?: number; clipId?: string };
  // A clip imported from a link is already stored: it only needs its frames' links.
  const existing = clipId && /^[a-f0-9-]{36}$/.test(clipId) ? clipId : null;
  if (!existing && !(type && type in CLIP_EXT)) return NextResponse.json({ error: "אפשר להעלות סרטונים בפורמט MP4, MOV או WebM" }, { status: 400 });
  const n = Math.min(MAX_THUMBS, Math.max(0, Number(thumbs) || 0));

  const storage = createAdminClient().storage.from("kit-assets");
  const cid = existing ?? randomUUID();
  const folder = `${user.id}/${id}/clips/${cid}`;
  const sign = async (path: string) => {
    const { data, error } = await storage.createSignedUploadUrl(path, { upsert: true });
    if (error) throw error;
    return { path, token: data.token };
  };
  const [video, ...frames] = await Promise.all([
    existing ? Promise.resolve(null) : sign(`${folder}/source.${CLIP_EXT[type!]}`),
    ...Array.from({ length: n }, (_, i) => sign(`${folder}/thumb-${i}.jpg`)),
  ]);
  return NextResponse.json({ clipId: cid, video, thumbs: frames });
}
