import { NextResponse } from "next/server";
import { alertOwner } from "@/lib/alert";
import { getUserAndClient } from "@/lib/kits";
import { createAdminClient } from "@/lib/supabase/admin";
import { clipFolder, MAX_CLIPS, MAX_THUMBS } from "@/lib/video/clip-files";
import { analyzeClip } from "@/lib/video/clips";
import type { CourseClip } from "@/lib/video/storyboard-ui";

export const maxDuration = 300;

async function load(id: string) {
  const { supabase, user } = await getUserAndClient();
  if (!user) return { error: NextResponse.json({ error: "צריך להתחבר" }, { status: 401 }) };
  const { data } = await supabase.from("kits").select("clips").eq("id", id).maybeSingle<{ clips: CourseClip[] }>();
  if (!data) return { error: NextResponse.json({ error: "הערכה לא נמצאה" }, { status: 404 }) };
  return { user, clips: data.clips ?? [] };
}

const put = async (kit: string, clip: CourseClip) => {
  const { data, error } = await createAdminClient().rpc("kit_clip_put", { p_kit: kit, p_clip: clip });
  if (error) throw error;
  return data as CourseClip[];
};

export async function GET(_req: Request, ctx: RouteContext<"/api/kits/[id]/clips">) {
  const { id } = await ctx.params;
  const loaded = await load(id);
  if ("error" in loaded) return loaded.error;
  return NextResponse.json({ clips: loaded.clips });
}

// A clip is in storage (see ./uploads or ./link): it is registered, then transcribed and watched.
export async function POST(req: Request, ctx: RouteContext<"/api/kits/[id]/clips">) {
  const { id } = await ctx.params;
  const loaded = await load(id);
  if ("error" in loaded) return loaded.error;
  const { user, clips } = loaded;
  const body = (await req.json()) as { clipId?: string; name?: string; seconds?: number; aspect?: number; thumbs?: number[] };
  const clipId = String(body.clipId ?? "");
  if (!/^[a-f0-9-]{36}$/.test(clipId)) return NextResponse.json({ error: "קטע לא מוכר" }, { status: 400 });
  if (!clips.some((c) => c.id === clipId) && clips.length >= MAX_CLIPS) return NextResponse.json({ error: `אפשר עד ${MAX_CLIPS} קטעים לערכה` }, { status: 400 });
  const seconds = Number(body.seconds);
  const aspect = Number(body.aspect);
  if (!(seconds > 0.5) || !(aspect > 0.2 && aspect < 5)) return NextResponse.json({ error: "לא הצלחנו לקרוא את הסרטון" }, { status: 400 });

  const storage = createAdminClient().storage.from("kit-assets");
  const folder = clipFolder(user.id, id, clipId);
  const { data: files } = await storage.list(folder);
  const source = files?.find((f) => f.name.startsWith("source."));
  if (!source) return NextResponse.json({ error: "הסרטון לא הגיע. נסו להעלות שוב." }, { status: 400 });
  const url = (path: string) => storage.getPublicUrl(path).data.publicUrl;
  const times = (body.thumbs ?? []).slice(0, MAX_THUMBS);
  const clip: CourseClip = {
    id: clipId,
    url: url(`${folder}/${source.name}`),
    name: String(body.name ?? "קטע").slice(0, 80),
    seconds,
    aspect,
    thumbs: times.filter((_, i) => files?.some((f) => f.name === `thumb-${i}.jpg`)).map((t, i) => ({ t, url: url(`${folder}/thumb-${i}.jpg`) })),
    status: "analyzing",
  };
  await put(id, clip);
  try {
    const done = await analyzeClip(clip);
    return NextResponse.json({ clip: done, clips: await put(id, done) });
  } catch (e) {
    await alertOwner("clip:failed", "ניתוח קטע מהקורס נכשל", { kit: id, clip: clipId, error: (e as Error).message });
    const failed: CourseClip = { ...clip, status: "failed" };
    return NextResponse.json({ clip: failed, clips: await put(id, failed) });
  }
}

// A clip the user no longer wants, with its files.
export async function DELETE(req: Request, ctx: RouteContext<"/api/kits/[id]/clips">) {
  const { id } = await ctx.params;
  const loaded = await load(id);
  if ("error" in loaded) return loaded.error;
  const clipId = new URL(req.url).searchParams.get("clipId") ?? "";
  if (!loaded.clips.some((c) => c.id === clipId)) return NextResponse.json({ error: "לא נמצא" }, { status: 400 });
  const db = createAdminClient();
  const folder = clipFolder(loaded.user.id, id, clipId);
  const { data: files } = await db.storage.from("kit-assets").list(folder);
  if (files?.length) await db.storage.from("kit-assets").remove(files.map((f) => `${folder}/${f.name}`));
  const { data } = await db.rpc("kit_clip_remove", { p_kit: id, p_clip: clipId });
  return NextResponse.json({ clips: data ?? [] });
}
