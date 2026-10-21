import type Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { emptyBrief, type Brief } from "@/lib/agent/brief";
import { interviewTurn } from "@/lib/agent/interview";
import { findLinks, linkText } from "@/lib/agent/link-text";
import { getUserAndClient, type ChatMessage } from "@/lib/kits";

export const maxDuration = 120;

// One interview turn: the user's message in, the agent's reply and updated brief out.
export async function POST(req: Request, ctx: RouteContext<"/api/kits/[id]/chat">) {
  const { id } = await ctx.params;
  const { text } = (await req.json()) as { text?: string };
  const message = (text ?? "").trim().slice(0, 4000);
  if (!message) return NextResponse.json({ error: "הודעה ריקה" }, { status: 400 });

  const { supabase, user } = await getUserAndClient();
  if (!user) return NextResponse.json({ error: "צריך להתחבר" }, { status: 401 });
  const { data: kit } = await supabase.from("kits").select("messages, brief").eq("id", id).maybeSingle();
  if (!kit) return NextResponse.json({ error: "הערכה לא נמצאה" }, { status: 404 });

  const messages = [...(kit.messages as ChatMessage[]), { role: "user", text: message } as ChatMessage];

  // A pasted link is read so the agent can fill the brief from it.
  const pages = await Promise.all(findLinks(message).map(async (u) => ({ u, t: await linkText(u) })));
  const context = pages
    .filter((p) => p.t)
    .map((p) => `\n\n[תוכן הדף ${p.u}]\n${p.t}`)
    .join("");

  const history: Anthropic.Beta.BetaMessageParam[] = messages
    .slice(1) // the greeting is ours, not part of the model's conversation
    .map((m, i, all) => ({
      role: m.role,
      content: i === all.length - 1 && context ? `${m.text}${context}` : m.text,
    }));

  try {
    const turn = await interviewTurn(history, (kit.brief as Brief | null) ?? emptyBrief);
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
