import { NextResponse } from "next/server";
import { z } from "zod";
import { videoSchema } from "@/engine/video/schema";
import { structured } from "@/lib/ai/claude";
import { NOT_ENOUGH, spend } from "@/lib/credits";
import { getUserAndClient } from "@/lib/kits";
import { COST } from "@/lib/plans";
import { describeSpec, EDIT_OPS } from "@/lib/video/video-edits";

export const maxDuration = 120;

const opsSchema = z.object({
  reply: z.string().describe("Hebrew, one short sentence: what was changed (or a question if the request is unclear)"),
  ops: z.array(
    z.object({
      op: z.enum(EDIT_OPS),
      scene: z.number().nullable().describe("1-based scene number, or null for whole-video edits (accent, ink, captions, music)"),
      text: z.string().nullable().describe("title / sub / caption: the new on-screen text; voice: the new narration line (it will be recorded again)"),
      words: z.array(z.string()).nullable().describe("emphasis: the caption words to highlight, exactly as written in the caption"),
      color: z.string().nullable().describe("accent / ink: #rrggbb"),
      value: z.number().nullable().describe("music: level 0–2 (1 = as mixed); calm: 1 = no motion in the scene, 0 = motion back"),
      style: z.string().nullable().describe("captions: bold | box | minimal | off; transition: cut | whip | zoom | flash | fade"),
    }),
  ),
});

const SYSTEM = `You are the editor of a finished promo or marketing video (Hebrew, 9:16). The user asks in Hebrew for small changes and you answer with precise edit operations on the video as described (scenes numbered from 1, with their seconds, what they show, title, sub, caption text, highlighted words, calm, transition to the next scene).
Operations:
- title / sub: the big on-screen words of a scene (fix spelling, shorten, rephrase).
- caption: the caption text of a scene (fix spelling). The narration audio does not change; only the written captions.
- emphasis: which caption words are highlighted (words exactly as in the caption).
- voice: a new narration line for a scene; it will be recorded again (use only when the user wants to change what is SAID).
- delete: remove a scene.
- calm: value 1 removes the motion in a scene (camera moves, cuts, zoom punches) — "remove the animation"; 0 brings it back.
- transition: how a scene hands over to the next (cut, whip, zoom, flash, fade).
- accent / ink: the video's highlight colour / text colour, #rrggbb.
- captions: the caption style (bold, box, minimal, off).
- music: music level, 1 = as mixed, 0.5 quieter, 1.5 louder.
When the user names a moment by time ("in second 12"), find the scene by its seconds. Change only what was asked. Never invent facts.`;

export async function POST(req: Request, ctx: RouteContext<"/api/kits/[id]/videos/[vid]/edit-agent">) {
  const { id } = await ctx.params;
  const { user } = await getUserAndClient();
  if (!user) return NextResponse.json({ error: "צריך להתחבר" }, { status: 401 });
  const { spec, instruction } = (await req.json()) as { spec?: unknown; instruction?: string };
  const parsed = videoSchema.safeParse(spec);
  if (!parsed.success || !instruction?.trim()) return NextResponse.json({ error: "מה לשנות?" }, { status: 400 });
  // The agent only edits the preview (1 credit, like a chat edit); saving a version checks the plan.
  if (!(await spend(user.id, COST.edit, "video-edit-chat", id))) return NextResponse.json({ error: NOT_ENOUGH, code: "credits" }, { status: 402 });
  try {
    const out = await structured({
      schema: opsSchema,
      system: SYSTEM,
      effort: "medium",
      maxTokens: 4000,
      messages: [{ role: "user", content: `הסרטון:\n${JSON.stringify(describeSpec(parsed.data), null, 2)}\n\nהבקשה: ${instruction.trim().slice(0, 1000)}` }],
    });
    return NextResponse.json(out);
  } catch {
    return NextResponse.json({ error: "לא הצלחתי לבצע את השינוי. נסו לנסח אחרת." }, { status: 502 });
  }
}
