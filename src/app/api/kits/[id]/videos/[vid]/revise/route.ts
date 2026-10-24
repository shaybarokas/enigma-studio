import { costContext, overDailyLimit, OVER_DAILY } from "@/lib/costs";
import type { CourseClip } from "@/lib/video/storyboard-ui";
import { NextResponse } from "next/server";
import type { DesignProps } from "@/engine/design";
import type { Brief } from "@/lib/agent/brief";
import type { Media } from "@/lib/agent/media";
import { getUserAndClient } from "@/lib/kits";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  reviseStoryboard,
  VIDEO_FIELDS,
  type Storyboard,
} from "@/lib/video/storyboard";

export const maxDuration = 120;

// "Make the hook sharper", "shorter", "add the price": the agent rewrites the storyboard draft.
export async function POST(
  req: Request,
  ctx: RouteContext<"/api/kits/[id]/videos/[vid]/revise">,
) {
  const { id, vid } = await ctx.params;
  const { instruction } = (await req.json()) as { instruction?: string };
  if (!instruction?.trim())
    return NextResponse.json({ error: "מה לשנות?" }, { status: 400 });
  const { supabase, user } = await getUserAndClient();
  costContext({ action: "storyboard", userId: user?.id, kitId: id, videoId: vid });
  if (user && (await overDailyLimit(user.id, "storyboard"))) return NextResponse.json({ error: OVER_DAILY }, { status: 429 });
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
      .select("brief, design, media, clips")
      .eq("id", id)
      .maybeSingle(),
  ]);
  if (!video || !kit?.design)
    return NextResponse.json({ error: "הסרטון לא נמצא" }, { status: 404 });
  if (video.status !== "draft")
    return NextResponse.json({ error: "הסרטון כבר הופק" }, { status: 409 });
  try {
    const storyboard = await reviseStoryboard(
      video.storyboard as Storyboard,
      instruction.trim().slice(0, 1000),
      {
        brief: kit.brief as Brief | null,
        design: kit.design as DesignProps,
        media: (kit.media as Media[] | null) ?? [],
        clips: (kit.clips as CourseClip[] | null) ?? [],
      },
    );
    const { data } = await createAdminClient()
      .from("videos")
      .update({ storyboard })
      .eq("id", vid)
      .select(VIDEO_FIELDS)
      .single();
    return NextResponse.json({ video: data });
  } catch (e) {
    console.error("[storyboard-revise]", e);
    return NextResponse.json(
      { error: "לא הצלחתי לבצע את השינוי. נסו לנסח אחרת." },
      { status: 502 },
    );
  }
}
