import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getUserAndClient } from "@/lib/kits";
import { createAdminClient } from "@/lib/supabase/admin";
import { CLIP_EXT, clipFolder, LINK_MAX_MB } from "@/lib/video/clip-files";

export const maxDuration = 300;

// Pages that play video but don't hand out the file: their videos can't be taken from a link.
const PLAYER_SITES = /(youtube\.com|youtu\.be|vimeo\.com|facebook\.com|fb\.watch|instagram\.com|tiktok\.com|drive\.google\.com|dropbox\.com\/s\/)/i;

// A course clip from a link: only a direct video file (…/clip.mp4) is fetched into storage. The
// browser then takes its frames and registers it like an upload.
export async function POST(req: Request, ctx: RouteContext<"/api/kits/[id]/clips/link">) {
  const { id } = await ctx.params;
  const { supabase, user } = await getUserAndClient();
  if (!user) return NextResponse.json({ error: "צריך להתחבר" }, { status: 401 });
  const { data: kit } = await supabase.from("kits").select("id").eq("id", id).maybeSingle();
  if (!kit) return NextResponse.json({ error: "הערכה לא נמצאה" }, { status: 404 });
  const { url } = (await req.json()) as { url?: string };
  let link: URL;
  try {
    link = new URL(String(url ?? "").trim());
    if (!/^https?:$/.test(link.protocol)) throw new Error();
  } catch {
    return NextResponse.json({ error: "זה לא נראה כמו קישור" }, { status: 400 });
  }
  if (PLAYER_SITES.test(link.hostname + link.pathname))
    return NextResponse.json({ error: "מיוטיוב, וימאו ורשתות חברתיות אי אפשר למשוך סרטון. הורידו את הקטע למחשב והעלו אותו כאן." }, { status: 400 });

  const res = await fetch(link, { redirect: "follow" }).catch(() => null);
  const type = res?.headers.get("content-type")?.split(";")[0].trim() ?? "";
  if (!res?.ok || !(type in CLIP_EXT))
    return NextResponse.json({ error: "בקישור הזה אין קובץ וידאו ישיר (MP4, MOV או WebM). אפשר להוריד את הקטע ולהעלות אותו." }, { status: 400 });
  const size = Number(res.headers.get("content-length") ?? 0);
  if (size > LINK_MAX_MB * 1024 * 1024) return NextResponse.json({ error: `הסרטון בקישור גדול מ־${LINK_MAX_MB}MB. הורידו אותו והעלו אותו כקובץ (עד 2GB).` }, { status: 400 });

  const data = Buffer.from(await res.arrayBuffer());
  if (data.length > LINK_MAX_MB * 1024 * 1024) return NextResponse.json({ error: `הסרטון בקישור גדול מ־${LINK_MAX_MB}MB. הורידו אותו והעלו אותו כקובץ (עד 2GB).` }, { status: 400 });
  const clipId = randomUUID();
  const storage = createAdminClient().storage.from("kit-assets");
  const path = `${clipFolder(user.id, id, clipId)}/source.${CLIP_EXT[type]}`;
  const { error } = await storage.upload(path, data, { contentType: type, upsert: true });
  if (error) return NextResponse.json({ error: error.message.includes("size") ? `הסרטון גדול מדי לאחסון. העלו קטע קצר יותר.` : "שמירת הסרטון נכשלה" }, { status: 400 });
  return NextResponse.json({ clipId, url: storage.getPublicUrl(path).data.publicUrl, name: decodeURIComponent(link.pathname.split("/").pop() ?? "קטע") });
}
