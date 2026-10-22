import type Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { emptyBrief, type Brief } from "@/lib/agent/brief";
import { historyFrom, interviewTurn } from "@/lib/agent/interview";
import type { Media } from "@/lib/agent/media";
import { findLinks, linkText } from "@/lib/agent/link-text";
import { generateScene } from "@/lib/agent/assets";
import { applyEdit, planEdit } from "@/lib/agent/edit";
import type { DesignProps } from "@/engine/design";
import { NOT_ENOUGH, refund, spend } from "@/lib/credits";
import { getUserAndClient, type ChatMessage } from "@/lib/kits";
import { COST } from "@/lib/plans";

export const maxDuration = 180;

// One interview turn: the user's message in, the agent's reply and updated brief out.
export async function POST(req: Request, ctx: RouteContext<"/api/kits/[id]/chat">) {
  const { id } = await ctx.params;
  const { text } = (await req.json()) as { text?: string };
  const message = (text ?? "").trim().slice(0, 4000);
  if (!message) return NextResponse.json({ error: "הודעה ריקה" }, { status: 400 });

  const { supabase, user } = await getUserAndClient();
  if (!user) return NextResponse.json({ error: "צריך להתחבר" }, { status: 401 });
  const { data: kit } = await supabase.from("kits").select("messages, brief, status, design, media").eq("id", id).maybeSingle();
  if (!kit) return NextResponse.json({ error: "הערכה לא נמצאה" }, { status: 404 });

  const messages = [...(kit.messages as ChatMessage[]), { role: "user", text: message } as ChatMessage];

  // A pasted link is read so the agent can fill the brief from it.
  const pages = await Promise.all(findLinks(message).map(async (u) => ({ u, t: await linkText(u) })));
  const context = pages
    .filter((p) => p.t)
    .map((p) => `\n\n[תוכן הדף ${p.u}]\n${p.t}`)
    .join("");

  const history: Anthropic.Beta.BetaMessageParam[] = historyFrom(messages, context);

  // Once the kit is designed, the chat edits it.
  if (kit.status === "ready" && kit.design) {
    if (!(await spend(user.id, COST.edit, "edit", id))) return NextResponse.json({ error: NOT_ENOUGH, code: "credits" }, { status: 402 });
    try {
      const recent = history.slice(-12);
      while (recent[0]?.role === "assistant") recent.shift(); // a conversation must open with the user
      const edit = await planEdit(recent, kit.design as DesignProps);
      let background: { wide: string; tall: string } | undefined;
      // A new scene costs more; without the credits the rest of the change still applies.
      const sceneOk = edit.newBackgroundPrompt ? await spend(user.id, COST.editWithScene - COST.edit, "edit-scene", id) : false;
      if (edit.newBackgroundPrompt && !sceneOk) edit.reply += "\n(רקע חדש דורש עוד קרדיטים, אז את הרקע השארתי כמו שהוא.)";
      if (edit.newBackgroundPrompt && sceneOk) {
        const stamp = Date.now();
        const [wide, tall] = await Promise.all([
          generateScene(edit.newBackgroundPrompt, "16:9", `${user.id}/${id}/edit-${stamp}-16x9.jpg`),
          generateScene(edit.newBackgroundPrompt, "9:16", `${user.id}/${id}/edit-${stamp}-9x16.jpg`),
        ]);
        background = { wide, tall };
      }
      const design = applyEdit(kit.design as DesignProps, edit, background);
      const reply: ChatMessage = { role: "assistant", text: edit.reply };
      await supabase.from("kits").update({ messages: [...messages, reply], design }).eq("id", id);
      return NextResponse.json({ reply, design });
    } catch (e) {
      console.error("[chat-edit]", e);
      await refund(user.id, COST.edit, id);
      return NextResponse.json({ error: "לא הצלחתי לבצע את השינוי. נסו לנסח אחרת." }, { status: 502 });
    }
  }

  try {
    const turn = await interviewTurn(history, (kit.brief as Brief | null) ?? emptyBrief, (kit.media as Media[] | null) ?? []);
    const reply: ChatMessage = { role: "assistant", text: turn.reply, quickReplies: turn.quickReplies };
    const title = turn.brief.title ?? undefined;
    await supabase
      .from("kits")
      .update({ messages: [...messages, reply], brief: turn.brief, ...(title ? { title } : {}) })
      .eq("id", id);
    return NextResponse.json({ reply, brief: turn.brief, ready: turn.ready, title });
  } catch (e) {
    console.error("[chat]", e);
    return NextResponse.json({ error: "הסוכן לא הצליח לענות כרגע. נסו שוב." }, { status: 502 });
  }
}
