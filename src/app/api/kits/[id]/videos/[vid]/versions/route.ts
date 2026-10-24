import { costContext } from "@/lib/costs";
import { after, NextResponse } from "next/server";
import { FPS, videoDuration, videoSchema } from "@/engine/video/schema";
import { getAccount, NOT_ENOUGH, spend } from "@/lib/credits";
import { getUserAndClient } from "@/lib/kits";
import { COST, kitFeatures } from "@/lib/plans";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Storyboard } from "@/lib/video/storyboard";
import { VIDEO_FIELDS } from "@/lib/video/storyboard";
import type { Revoice } from "@/lib/video/video-edits";
import { ownMediaOnly, produceVersion } from "@/lib/video/versions";
import type { VoiceKey } from "@/lib/video/voices";

// The re-voicing and the render run after the response.
export const maxDuration = 800;

// A new version of a finished video from the video editor: the edited spec and the lines to record
// again. The original stays as it is.
export async function POST(req: Request, ctx: RouteContext<"/api/kits/[id]/videos/[vid]/versions">) {
  const { id, vid } = await ctx.params;
  const { supabase, user } = await getUserAndClient();
  if (!user) return NextResponse.json({ error: "צריך להתחבר" }, { status: 401 });
  const [{ data: video }, { data: kit }] = await Promise.all([
    supabase.from("videos").select("status, kind, voice, storyboard, spec").eq("id", vid).eq("kit_id", id).maybeSingle(),
    supabase.from("kits").select("unlocked").eq("id", id).maybeSingle(),
  ]);
  if (!video || !kit) return NextResponse.json({ error: "הסרטון לא נמצא" }, { status: 404 });
  if (video.status !== "ready") return NextResponse.json({ error: "אפשר לערוך רק סרטון מוכן" }, { status: 409 });
  const original = videoSchema.safeParse(video.spec);
  if (!original.success) return NextResponse.json({ error: "הסרטון הזה הופק בגרסה קודמת של המנוע ואי אפשר לערוך אותו כאן. אפשר ליצור ממנו גרסה חדשה מהתסריט." }, { status: 409 });

  const body = (await req.json()) as { spec?: unknown; revoice?: Revoice[] };
  const parsed = videoSchema.safeParse(body.spec);
  if (!parsed.success || !ownMediaOnly(body.spec) || parsed.data.scenes.length < 2) return NextResponse.json({ error: "העריכה לא תקינה" }, { status: 400 });
  const spec = { ...parsed.data, kind: original.data.kind, cover: original.data.cover };
  const revoice = (body.revoice ?? [])
    .filter((r) => Number.isInteger(r.scene) && r.scene >= 1 && r.scene <= spec.scenes.length && typeof r.text === "string" && r.text.trim())
    .map((r) => ({ scene: r.scene, text: r.text.trim().slice(0, 300) }))
    .slice(0, 12);

  const account = await getAccount(user.id);
  if (!kitFeatures(account.plan, kit.unlocked).videos) return NextResponse.json({ error: "עריכת סרטונים כלולה במסלולים בתשלום.", code: "plan" }, { status: 402 });
  if (!(await spend(user.id, COST.videoEdit, "video-edit", id))) return NextResponse.json({ error: NOT_ENOUGH, code: "credits" }, { status: 402 });

  const db = createAdminClient();
  const { data: row, error } = await db
    .from("videos")
    .insert({ kit_id: id, user_id: user.id, kind: video.kind, voice: video.voice, status: "writing", storyboard: video.storyboard, spec, edited_from: vid })
    .select(VIDEO_FIELDS)
    .single();
  if (error || !row) return NextResponse.json({ error: "לא הצלחנו להתחיל" }, { status: 500 });
  costContext({ action: "video-version", userId: user.id, kitId: id, videoId: row.id });
  after(() =>
    produceVersion({
      videoId: row.id,
      userId: user.id,
      kitId: id,
      spec,
      revoice,
      voice: video.voice as VoiceKey,
      musicPrompt: (video.storyboard as Storyboard | null)?.music ?? null,
      musicSeconds: videoDuration(original.data.scenes) / FPS + 1,
      cost: COST.videoEdit,
    }),
  );
  return NextResponse.json({ video: row });
}
