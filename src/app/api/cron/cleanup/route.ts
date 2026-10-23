import { NextResponse, type NextRequest } from "next/server";
import { alertOwner } from "@/lib/alert";
import { cronAuthorized } from "@/lib/cron";
import { createAdminClient } from "@/lib/supabase/admin";
import { CLIP_DAYS, clipFolder } from "@/lib/video/clip-files";
import type { CourseClip } from "@/lib/video/storyboard-ui";

export const maxDuration = 300;

// Daily (vercel.json): recorded lessons are big, so a kit nobody has used for CLIP_DAYS (no edit, no
// new video) gives its course clips back. Finished videos are kept; they are files of their own.
export async function GET(request: NextRequest) {
  if (!cronAuthorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const db = createAdminClient();
  const before = new Date(Date.now() - CLIP_DAYS * 86_400_000).toISOString();
  const { data: kits, error } = await db.from("kits").select("id, user_id, clips").lt("updated_at", before).neq("clips", "[]").limit(200);
  if (error) {
    await alertOwner("cron:cleanup", "ניקוי קטעי קורס ישנים נכשל", { error: error.message });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  let removed = 0;
  for (const kit of kits ?? []) {
    // A video made lately counts as use.
    const { count } = await db.from("videos").select("id", { count: "exact", head: true }).eq("kit_id", kit.id).gt("created_at", before);
    if (count) continue;
    for (const clip of (kit.clips as CourseClip[]) ?? []) {
      const folder = clipFolder(kit.user_id, kit.id, clip.id);
      const { data: files } = await db.storage.from("kit-assets").list(folder);
      if (files?.length) await db.storage.from("kit-assets").remove(files.map((f) => `${folder}/${f.name}`));
      await db.rpc("kit_clip_remove", { p_kit: kit.id, p_clip: clip.id });
      removed++;
    }
  }
  return NextResponse.json({ ok: true, kits: kits?.length ?? 0, removed });
}
