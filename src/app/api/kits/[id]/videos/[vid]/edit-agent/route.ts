import { costContext } from "@/lib/costs";
import { NextResponse } from "next/server";
import { videoSchema } from "@/engine/video/schema";
import { NOT_ENOUGH, spend } from "@/lib/credits";
import { getUserAndClient } from "@/lib/kits";
import { COST } from "@/lib/plans";
import { planVideoEdit } from "@/lib/video/edit-agent";

export const maxDuration = 120;

export async function POST(req: Request, ctx: RouteContext<"/api/kits/[id]/videos/[vid]/edit-agent">) {
  const { id, vid } = await ctx.params;
  const { user } = await getUserAndClient();
  costContext({ action: "video-edit-agent", userId: user?.id, kitId: id, videoId: vid });
  if (!user) return NextResponse.json({ error: "צריך להתחבר" }, { status: 401 });
  const { spec, instruction } = (await req.json()) as { spec?: unknown; instruction?: string };
  const parsed = videoSchema.safeParse(spec);
  if (!parsed.success || !instruction?.trim()) return NextResponse.json({ error: "מה לשנות?" }, { status: 400 });
  // The agent only edits the preview (1 credit, like a chat edit); saving a version checks the plan.
  if (!(await spend(user.id, COST.edit, "video-edit-chat", id))) return NextResponse.json({ error: NOT_ENOUGH, code: "credits" }, { status: 402 });
  try {
    const out = await planVideoEdit(parsed.data, instruction.trim());
    return NextResponse.json(out);
  } catch {
    return NextResponse.json({ error: "לא הצלחתי לבצע את השינוי. נסו לנסח אחרת." }, { status: 502 });
  }
}
