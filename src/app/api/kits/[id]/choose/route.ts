import { NextResponse } from "next/server";
import { getUserAndClient, type ChatMessage, type KitConcept } from "@/lib/kits";

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
  return NextResponse.json({ design, messages: next });
}
