import { after, NextResponse } from "next/server";
import type { DesignProps } from "@/engine/design";
import { getAccount, NOT_ENOUGH, spend } from "@/lib/credits";
import { getUserAndClient, type KitConcept } from "@/lib/kits";
import { COST, kitFeatures } from "@/lib/plans";
import { createAdminClient } from "@/lib/supabase/admin";
import { produceVideo } from "@/lib/video/produce";
import type { CourseClip } from "@/lib/video/storyboard-ui";
import {
  motionCount,
  speechIssues,
  VIDEO_FIELDS,
  type Storyboard,
} from "@/lib/video/storyboard";
import type { VoiceKey } from "@/lib/video/voices";

// The whole production (voice, music, render) runs after the response.
export const maxDuration = 800;

// The approved storyboard goes to production; credits are spent now (and returned if it fails).
export async function POST(
  req: Request,
  ctx: RouteContext<"/api/kits/[id]/videos/[vid]/produce">,
) {
  const { id, vid } = await ctx.params;
  const { force } = (await req.json().catch(() => ({}))) as { force?: boolean };
  const { supabase, user } = await getUserAndClient();
  if (!user)
    return NextResponse.json({ error: "צריך להתחבר" }, { status: 401 });
  const [{ data: video }, { data: kit }] = await Promise.all([
    supabase
      .from("videos")
      .select("status, storyboard")
      .eq("id", vid)
      .eq("kit_id", id)
      .maybeSingle(),
    supabase
      .from("kits")
      .select("design, concepts, chosen, unlocked, clips")
      .eq("id", id)
      .maybeSingle(),
  ]);
  if (!video || !kit?.design || kit.chosen == null)
    return NextResponse.json({ error: "הסרטון לא נמצא" }, { status: 404 });
  if (video.status !== "draft")
    return NextResponse.json({ error: "הסרטון כבר בהפקה" }, { status: 409 });
  const storyboard = video.storyboard as Storyboard;

  // Words the voice may misread: the user decides (rephrase, or produce as is).
  const issues = speechIssues(storyboard);
  if (issues.length && !force)
    return NextResponse.json({ code: "speech", issues }, { status: 422 });

  const account = await getAccount(user.id);
  const plan = kitFeatures(account.plan, kit.unlocked);
  const db = createAdminClient();
  let cost = 0;
  const motions = motionCount(storyboard);
  if (motions && !plan.videos)
    return NextResponse.json({ error: "קטעי וידאו AI כלולים במסלולים בתשלום.", code: "plan" }, { status: 402 });
  if (!plan.videos) {
    if (account.free_video_used || storyboard.kind !== "promo")
      return NextResponse.json(
        {
          error:
            "סרטונים כלולים במסלולים בתשלום. במסלול החינמי יש סרטון פרומו לדוגמה אחד.",
          code: "plan",
        },
        { status: 402 },
      );
    await db
      .from("accounts")
      .update({ free_video_used: true })
      .eq("user_id", user.id);
  } else {
    // The video and its AI clips, in one charge (each failed clip is given back).
    cost = COST.video + motions * COST.motion;
    if (!(await spend(user.id, cost, "video", id)))
      return NextResponse.json(
        { error: NOT_ENOUGH, code: "credits" },
        { status: 402 },
      );
  }

  const { data: row } = await db
    .from("videos")
    .update({ status: "writing", error: null })
    .eq("id", vid)
    .select(VIDEO_FIELDS)
    .single();
  after(() =>
    produceVideo({
      videoId: vid,
      userId: user.id,
      kitId: id,
      storyboard,
      voice: storyboard.voice as VoiceKey,
      design: { ...(kit.design as DesignProps), watermark: plan.watermark },
      cost,
      cover: (kit.concepts as KitConcept[])[kit.chosen].concept.templateId,
      style: (kit.concepts as KitConcept[])[kit.chosen].concept.backgroundPrompt,
      clips: (kit.clips as CourseClip[] | null) ?? [],
    }),
  );
  return NextResponse.json({ video: row });
}
