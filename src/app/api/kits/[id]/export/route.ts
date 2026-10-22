import { NextResponse } from "next/server";
import { FORMAT_IDS, type FormatId } from "@/engine/formats";
import { TEMPLATE_IDS, type TemplateId } from "@/engine/catalog";
import type { DesignProps } from "@/engine/design";
import { getUserAndClient, type KitConcept } from "@/lib/kits";
import { exportStills, type ExportItem } from "@/lib/render/export";
import { getAccount } from "@/lib/credits";
import { kitFeatures } from "@/lib/plans";

export const maxDuration = 300;

// Full-resolution PNGs of the chosen design: one item, or the whole kit as a ZIP.
export async function POST(req: Request, ctx: RouteContext<"/api/kits/[id]/export">) {
  const { id } = await ctx.params;
  const body = (await req.json()) as { items?: ExportItem[]; all?: boolean };
  const { supabase, user } = await getUserAndClient();
  if (!user) return NextResponse.json({ error: "צריך להתחבר" }, { status: 401 });
  const { data: kit } = await supabase.from("kits").select("title, design, concepts, chosen, unlocked").eq("id", id).maybeSingle();
  if (!kit?.design || kit.chosen == null) return NextResponse.json({ error: "צריך קודם לבחור כיוון" }, { status: 400 });

  const plan = kitFeatures((await getAccount(user.id)).plan, kit.unlocked);
  if (body.all && !plan.zip) return NextResponse.json({ error: "הורדת כל הערכה בקובץ אחד כלולה במסלולים בתשלום.", code: "plan" }, { status: 402 });
  if (!body.all && (body.items ?? []).some((i) => !plan.formats.includes(i.format)))
    return NextResponse.json({ error: "במסלול החינמי אפשר להוריד בריבוע ובסטורי. שאר הגדלים כלולים במסלולים בתשלום.", code: "plan" }, { status: 402 });

  const cover = (kit.concepts as KitConcept[])[kit.chosen].concept.templateId as TemplateId;
  const valid = (i: ExportItem) => TEMPLATE_IDS.includes(i.template) && FORMAT_IDS.includes(i.format as FormatId);
  const items: ExportItem[] = body.all
    ? (["cover", "ad-hook", "ad-list"] as const).flatMap((t) => FORMAT_IDS.map((format) => ({ template: t === "cover" ? cover : t, format })))
    : (body.items ?? []).filter(valid).slice(0, 4);
  if (items.length === 0) return NextResponse.json({ error: "לא נבחר מה להוריד" }, { status: 400 });

  try {
    const result = await exportStills(
      { ...(kit.design as DesignProps), watermark: plan.watermark },
      items,
      `${user.id}/${id}/exports`,
      body.all ? `${kit.title.replace(/[\\/:*?"<>|]/g, "").slice(0, 60) || "ערכה"}.zip` : undefined,
    );
    return NextResponse.json(result);
  } catch (e) {
    console.error("[export]", e);
    return NextResponse.json({ error: "ההפקה לא הצליחה. נסו שוב בעוד רגע." }, { status: 502 });
  }
}
