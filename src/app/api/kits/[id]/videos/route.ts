import { NextResponse } from "next/server";
import type { DesignProps } from "@/engine/design";
import type { Brief } from "@/lib/agent/brief";
import type { Media } from "@/lib/agent/media";
import { alertOwner } from "@/lib/alert";
import { balance, getAccount } from "@/lib/credits";
import { getUserAndClient } from "@/lib/kits";
import { COST, kitFeatures } from "@/lib/plans";
import { createAdminClient } from "@/lib/supabase/admin";
import { VIDEO_FIELDS, writeStoryboard } from "@/lib/video/storyboard";
import { DEFAULT_VOICE, VOICES, type VoiceKey } from "@/lib/video/voices";

export const maxDuration = 300;

export async function GET(
  _req: Request,
  ctx: RouteContext<"/api/kits/[id]/videos">,
) {
  const { id } = await ctx.params;
  const { supabase, user } = await getUserAndClient();
  if (!user)
    return NextResponse.json({ error: "צריך להתחבר" }, { status: 401 });
  const { data } = await supabase
    .from("videos")
    .select(VIDEO_FIELDS)
    .eq("kit_id", id)
    .order("created_at", { ascending: false });
  return NextResponse.json({ videos: data ?? [] });
}

// A new video starts as a storyboard draft the user edits and approves (no credits yet). The plan
// is checked now, so nobody writes a whole storyboard they can't produce.
export async function POST(
  req: Request,
  ctx: RouteContext<"/api/kits/[id]/videos">,
) {
  const { id } = await ctx.params;
  const { kind, voice } = (await req.json()) as {
    kind?: "promo" | "marketing";
    voice?: VoiceKey;
  };
  if (kind !== "promo" && kind !== "marketing")
    return NextResponse.json({ error: "סוג סרטון לא מוכר" }, { status: 400 });
  const v: VoiceKey = voice && voice in VOICES ? voice : DEFAULT_VOICE;

  const { supabase, user } = await getUserAndClient();
  if (!user)
    return NextResponse.json({ error: "צריך להתחבר" }, { status: 401 });
  const { data: kit } = await supabase
    .from("kits")
    .select("brief, design, chosen, unlocked, media")
    .eq("id", id)
    .maybeSingle();
  if (!kit?.design || kit.chosen == null)
    return NextResponse.json(
      { error: "צריך קודם לבחור כיוון" },
      { status: 400 },
    );

  const account = await getAccount(user.id);
  const plan = kitFeatures(account.plan, kit.unlocked);
  if (!plan.videos && (account.free_video_used || kind !== "promo"))
    return NextResponse.json(
      {
        error:
          "סרטונים כלולים במסלולים בתשלום. במסלול החינמי יש סרטון פרומו לדוגמה אחד.",
        code: "plan",
      },
      { status: 402 },
    );
  if (plan.videos && balance(account) < COST.video)
    return NextResponse.json(
      {
        error: `סרטון עולה ${COST.video} קרדיטים, ויש לך ${balance(account)}. אפשר להוסיף חבילה או לשדרג.`,
        code: "credits",
      },
      { status: 402 },
    );

  try {
    const storyboard = await writeStoryboard(
      kind,
      v,
      kit.brief as Brief | null,
      kit.design as DesignProps,
      (kit.media as Media[] | null) ?? [],
    );
    const { data: row, error } = await createAdminClient()
      .from("videos")
      .insert({
        kit_id: id,
        user_id: user.id,
        kind,
        voice: v,
        status: "draft",
        storyboard,
      })
      .select(VIDEO_FIELDS)
      .single();
    if (error) throw error;
    return NextResponse.json({ video: row });
  } catch (e) {
    await alertOwner("storyboard:failed", "כתיבת תסריט לסרטון נכשלה", {
      kit: id,
      error: (e as Error).message,
    });
    return NextResponse.json(
      { error: "לא הצלחנו לכתוב את התסריט. נסו שוב." },
      { status: 502 },
    );
  }
}
