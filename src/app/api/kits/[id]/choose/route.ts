import { after, NextResponse } from "next/server";
import { tallSceneFor } from "@/lib/agent/assets";
import { costContext } from "@/lib/costs";
import { getUserAndClient, type ChatMessage, type KitConcept } from "@/lib/kits";
import { createAdminClient } from "@/lib/supabase/admin";
import type { DesignProps } from "@/engine/design";

// Picks one of the three directions as the kit's design.
export async function POST(req: Request, ctx: RouteContext<"/api/kits/[id]/choose">) {
  const { id } = await ctx.params;
  const { index } = (await req.json()) as { index?: number };
  const { supabase, user } = await getUserAndClient();
  if (!user) return NextResponse.json({ error: "צריך להתחבר" }, { status: 401 });
  const { data: kit } = await supabase.from("kits").select("concepts, messages, status").eq("id", id).maybeSingle();
  const concepts = kit?.concepts as KitConcept[] | null;
  if (!concepts || typeof index !== "number" || !concepts[index]) return NextResponse.json({ error: "כיוון לא קיים" }, { status: 400 });
  const design = concepts[index].design;
  // The first time a kit is ready, the agent tells the user they can now ask for changes here.
  const messages = kit!.messages as ChatMessage[];
  const next =
    kit!.status === "ready"
      ? messages
      : [
          ...messages,
          {
            role: "assistant",
            text: `הערכה מוכנה ✦ ${concepts[index].concept.name}.\nמכאן אפשר לבקש ממני כל שינוי במילים פשוטות, ואני מעדכן את כל התוצרים בבת אחת. ואפשר גם לערוך ידנית ב"עריכת העיצוב".`,
            quickReplies: ["תעשה את זה יותר יוקרתי", "תגדיל את הכותרת", "רקע אחר, יותר בהיר", "כותרת יותר חדה"],
          } as ChatMessage,
        ];
  await supabase.from("kits").update({ chosen: index, design, status: "ready", messages: next }).eq("id", id);
  // The chosen direction's tall scene is painted now (part of the directions' credits). It joins
  // the design and the concept when ready; the studio picks it up (GET ../design).
  if (!design.assets.backgroundTall) {
    costContext({ action: "concepts", userId: user.id, kitId: id });
    after(async () => {
      try {
        const tall = await tallSceneFor(concepts[index].concept, `${user.id}/${id}`, index);
        const db = createAdminClient();
        const { data: now } = await db.from("kits").select("design, concepts, chosen").eq("id", id).single();
        const withTall = (d: DesignProps) => (d.assets.background === design.assets.background ? { ...d, assets: { ...d.assets, backgroundTall: tall } } : d);
        const list = (now!.concepts as KitConcept[]).map((c, i) => (i === index ? { ...c, design: withTall(c.design) } : c));
        await db
          .from("kits")
          .update({ concepts: list, ...(now!.chosen === index && now!.design ? { design: withTall(now!.design as DesignProps) } : {}) })
          .eq("id", id);
      } catch (e) {
        console.error("[choose:tall]", (e as Error).message); // the tall formats keep cropping the wide scene
      }
    });
  }
  return NextResponse.json({ design, messages: next });
}
