import { after, NextResponse } from "next/server";
import type { DesignProps } from "@/engine/design";
import type { Brief } from "@/lib/agent/brief";
import { getUserAndClient, type KitConcept } from "@/lib/kits";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_VOICE, VOICES, type VoiceKey } from "@/lib/video/voices";
import { produceVideo } from "@/lib/video/produce";

// The whole production (script, voice, music, render) runs after the response.
export const maxDuration = 800;

export async function GET(_req: Request, ctx: RouteContext<"/api/kits/[id]/videos">) {
  const { id } = await ctx.params;
  const { supabase, user } = await getUserAndClient();
  if (!user) return NextResponse.json({ error: "צריך להתחבר" }, { status: 401 });
  const { data } = await supabase
    .from("videos")
    .select("id, kind, voice, status, url, error, created_at")
    .eq("kit_id", id)
    .order("created_at", { ascending: false });
  return NextResponse.json({ videos: data ?? [] });
}

export async function POST(req: Request, ctx: RouteContext<"/api/kits/[id]/videos">) {
  const { id } = await ctx.params;
  const { kind, voice } = (await req.json()) as { kind?: "promo" | "marketing"; voice?: VoiceKey };
  if (kind !== "promo" && kind !== "marketing") return NextResponse.json({ error: "סוג סרטון לא מוכר" }, { status: 400 });
  const v: VoiceKey = voice && voice in VOICES ? voice : DEFAULT_VOICE;

  const { supabase, user } = await getUserAndClient();
  if (!user) return NextResponse.json({ error: "צריך להתחבר" }, { status: 401 });
  const { data: kit } = await supabase.from("kits").select("brief, design, concepts, chosen").eq("id", id).maybeSingle();
  if (!kit?.design || kit.chosen == null) return NextResponse.json({ error: "צריך קודם לבחור כיוון" }, { status: 400 });

  const db = createAdminClient();
  const { data: row, error } = await db
    .from("videos")
    .insert({ kit_id: id, user_id: user.id, kind, voice: v })
    .select("id, kind, voice, status, url, error, created_at")
    .single();
  if (error) return NextResponse.json({ error: "לא הצלחנו להתחיל את ההפקה" }, { status: 500 });

  after(() =>
    produceVideo({
      videoId: row.id,
      userId: user.id,
      kitId: id,
      kind,
      voice: v,
      brief: kit.brief as Brief | null,
      design: kit.design as DesignProps,
      cover: (kit.concepts as KitConcept[])[kit.chosen].concept.templateId,
    }),
  );
  return NextResponse.json({ video: row });
}
