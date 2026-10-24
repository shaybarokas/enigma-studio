import type { CourseClip } from "@/lib/video/storyboard-ui";
import { NextResponse } from "next/server";
import { getUserAndClient } from "@/lib/kits";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  cleanStoryboard,
  VIDEO_FIELDS,
  type Storyboard,
} from "@/lib/video/storyboard";
import { DEFAULT_VOICE, VOICES } from "@/lib/video/voices";
import { videoSchema } from "@/engine/video/schema";

async function draft(kitId: string, vid: string) {
  const { supabase, user } = await getUserAndClient();
  if (!user)
    return {
      error: NextResponse.json({ error: "צריך להתחבר" }, { status: 401 }),
    };
  const { data } = await supabase
    .from("videos")
    .select("id, status, storyboard")
    .eq("id", vid)
    .eq("kit_id", kitId)
    .maybeSingle();
  if (!data)
    return {
      error: NextResponse.json({ error: "הסרטון לא נמצא" }, { status: 404 }),
    };
  return {
    user,
    video: data as { id: string; status: string; storyboard: Storyboard },
  };
}

// A video with its render spec, for the video editor.
export async function GET(_req: Request, ctx: RouteContext<"/api/kits/[id]/videos/[vid]">) {
  const { id, vid } = await ctx.params;
  const { supabase, user } = await getUserAndClient();
  if (!user) return NextResponse.json({ error: "צריך להתחבר" }, { status: 401 });
  const { data } = await supabase.from("videos").select(`${VIDEO_FIELDS}, spec`).eq("id", vid).eq("kit_id", id).maybeSingle();
  if (!data) return NextResponse.json({ error: "הסרטון לא נמצא" }, { status: 404 });
  // Specs saved before a field existed get its default here, as the render gets them; one the
  // current engine can't read at all comes back as null (the editor can't open it).
  const spec = videoSchema.safeParse(data.spec);
  return NextResponse.json({ video: { ...data, spec: spec.success ? spec.data : null } });
}

// The user's edits to the storyboard (every word, the order, visuals, voice, music, captions).
export async function PATCH(
  req: Request,
  ctx: RouteContext<"/api/kits/[id]/videos/[vid]">,
) {
  const { id, vid } = await ctx.params;
  const d = await draft(id, vid);
  if ("error" in d) return d.error;
  if (d.video.status !== "draft")
    return NextResponse.json({ error: "הסרטון כבר הופק" }, { status: 409 });
  const { storyboard } = (await req.json()) as { storyboard?: unknown };
  const { data: kit } = await createAdminClient().from("kits").select("clips").eq("id", id).single();
  const clean = cleanStoryboard(storyboard, d.video.storyboard, (kit?.clips as CourseClip[] | null) ?? []);
  if (!clean || !(clean.voice in VOICES))
    return NextResponse.json({ error: "התסריט לא תקין" }, { status: 400 });
  const { data } = await createAdminClient()
    .from("videos")
    .update({ storyboard: clean, voice: clean.voice })
    .eq("id", vid)
    .select(VIDEO_FIELDS)
    .single();
  return NextResponse.json({ video: data });
}

// Back to the storyboard: a failed video reopens as the same draft; a finished one is copied into a
// new draft, so the user can change a line and produce another version.
export async function POST(
  _req: Request,
  ctx: RouteContext<"/api/kits/[id]/videos/[vid]">,
) {
  const { id, vid } = await ctx.params;
  const d = await draft(id, vid);
  if ("error" in d) return d.error;
  if (!d.video.storyboard)
    return NextResponse.json(
      { error: "לסרטון הזה אין תסריט שמור" },
      { status: 409 },
    );
  const db = createAdminClient();
  // A draft is narrated by a voice still offered (a retired one falls back to the default).
  const voice = d.video.storyboard.voice in VOICES ? d.video.storyboard.voice : DEFAULT_VOICE;
  const storyboard = { ...d.video.storyboard, voice };
  if (d.video.status === "failed") {
    const { data } = await db
      .from("videos")
      .update({ status: "draft", error: null, voice, storyboard })
      .eq("id", vid)
      .select(VIDEO_FIELDS)
      .single();
    return NextResponse.json({ video: data });
  }
  if (d.video.status !== "ready")
    return NextResponse.json({ error: "הסרטון עדיין בהפקה" }, { status: 409 });
  const { data, error } = await db
    .from("videos")
    .insert({
      kit_id: id,
      user_id: d.user.id,
      kind: d.video.storyboard.kind,
      voice,
      status: "draft",
      storyboard,
    })
    .select(VIDEO_FIELDS)
    .single();
  if (error)
    return NextResponse.json(
      { error: "לא הצלחנו לפתוח גרסה חדשה" },
      { status: 500 },
    );
  return NextResponse.json({ video: data, copy: true });
}

// A draft the user doesn't want.
export async function DELETE(
  _req: Request,
  ctx: RouteContext<"/api/kits/[id]/videos/[vid]">,
) {
  const { id, vid } = await ctx.params;
  const d = await draft(id, vid);
  if ("error" in d) return d.error;
  if (d.video.status !== "draft")
    return NextResponse.json({ error: "אפשר למחוק רק טיוטה" }, { status: 409 });
  await createAdminClient().from("videos").delete().eq("id", vid);
  return NextResponse.json({ ok: true });
}
