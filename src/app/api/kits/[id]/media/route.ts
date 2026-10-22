import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import type { DesignProps } from "@/engine/design";
import { emptyBrief, type Brief } from "@/lib/agent/brief";
import { historyFrom, interviewTurn } from "@/lib/agent/interview";
import { applyMedia } from "@/lib/agent/kit-media";
import { analyzeImage, MEDIA_ROLES, prepareMedia, ROLE_NAMES, storeOriginal, type Media, type MediaRole } from "@/lib/agent/media";
import { alertOwner } from "@/lib/alert";
import { getUserAndClient, type ChatMessage, type KitConcept } from "@/lib/kits";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 300;

const MAX_FILES = 6;
const SELECT = "messages, brief, status, design, concepts, subject, media";

type KitRow = { messages: ChatMessage[]; brief: Brief | null; status: string; design: DesignProps | null; concepts: KitConcept[] | null; subject: unknown; media: Media[] | null };

async function load(id: string) {
  const { supabase, user } = await getUserAndClient();
  if (!user) return { error: NextResponse.json({ error: "צריך להתחבר" }, { status: 401 }) };
  const { data } = await supabase.from("kits").select(SELECT).eq("id", id).maybeSingle<KitRow>();
  if (!data) return { error: NextResponse.json({ error: "הערכה לא נמצאה" }, { status: 404 }) };
  return { supabase, user, kit: { ...data, media: data.media ?? [] } };
}

// What changed for an already-designed kit, said plainly (no agent call, no credits).
function designedReply(added: Media[]) {
  const lines = added.map((m) =>
    m.role === "logo"
      ? "הלוגו נוסף לכל העיצובים ולסרטונים."
      : m.role === "lecturer"
        ? "התמונה החדשה של המרצה נכנסה לכל הגדלים."
        : m.role === "product"
          ? "המוצר נכנס לעיצובים כאביזר אמיתי."
          : `שמרתי את התמונה (${ROLE_NAMES[m.role]}). אפשר לכתוב לי מה לקחת ממנה.`,
  );
  return [...new Set(lines)].join("\n");
}

// Images in: each is stored, recognised (lecturer, logo, product, reference), prepared for its job,
// and put to work in the kit; the agent answers with what it took from them.
export async function POST(req: Request, ctx: RouteContext<"/api/kits/[id]/media">) {
  const { id } = await ctx.params;
  const loaded = await load(id);
  if ("error" in loaded) return loaded.error;
  const { supabase, user, kit } = loaded;

  // The images are already in storage (see ./uploads); only their paths come in.
  const body = (await req.json()) as { paths?: string[]; text?: string; role?: string };
  const prefix = `${user.id}/${id}/uploads/`;
  const paths = (body.paths ?? []).filter((p) => p.startsWith(prefix) && !p.includes(".."));
  const text = String(body.text ?? "").trim().slice(0, 2000);
  const forced = String(body.role ?? "") as MediaRole;
  if (!paths.length) return NextResponse.json({ error: "צריך לבחור תמונה" }, { status: 400 });
  if (paths.length > MAX_FILES) return NextResponse.json({ error: `אפשר עד ${MAX_FILES} תמונות בכל פעם` }, { status: 400 });
  const storage = createAdminClient().storage.from("kit-assets");

  const folder = `${user.id}/${id}`;
  let added: Media[];
  try {
    added = await Promise.all(
      paths.map(async (path) => {
        const mid = randomUUID().slice(0, 8);
        const { data: blob, error } = await storage.download(path);
        if (error || !blob) throw new Error(`upload missing: ${error?.message ?? path}`);
        if (blob.size > 20 * 1024 * 1024) throw new Error("too large");
        const url = await storeOriginal(Buffer.from(await blob.arrayBuffer()), folder, mid);
        await storage.remove([path]); // the raw upload is no longer needed once normalised
        const seen = await analyzeImage(url, text);
        const role = MEDIA_ROLES.includes(forced) ? forced : seen.role;
        return prepareMedia({ id: mid, url, role, note: seen.note, palette: seen.palette, text: seen.text }, folder);
      }),
    );
  } catch (e) {
    await alertOwner("media:failed", "עיבוד תמונות שהמשתמש העלה נכשל", { kit: id, error: (e as Error).message });
    return NextResponse.json({ error: "לא הצלחנו לעבד את התמונות. נסו שוב או תמונה אחרת." }, { status: 502 });
  }

  const before = kit.media;
  const applied = applyMedia({ ...kit, media: [...before, ...added] }, before);
  const userMsg: ChatMessage = { role: "user", text, images: added.map((m) => ({ url: m.url, role: m.role })) };
  const messages = [...kit.messages, userMsg];

  let reply: ChatMessage;
  let brief = applied.brief;
  let ready: boolean | undefined;
  if (kit.status === "ready" && kit.design) {
    reply = { role: "assistant", text: designedReply(added) };
  } else {
    try {
      const turn = await interviewTurn(historyFrom(messages), brief ?? emptyBrief, applied.media);
      reply = { role: "assistant", text: turn.reply, quickReplies: turn.quickReplies };
      brief = { ...turn.brief, brandColors: [...new Set([...(applied.brief?.brandColors ?? []), ...turn.brief.brandColors])].slice(0, 6) };
      ready = turn.ready;
    } catch (e) {
      console.error("[media-chat]", e);
      reply = { role: "assistant", text: `קיבלתי ${added.length === 1 ? "את התמונה" : `${added.length} תמונות`}: ${added.map((m) => ROLE_NAMES[m.role]).join(", ")}. בואו נמשיך.` };
    }
  }

  await supabase
    .from("kits")
    .update({ ...applied, brief, messages: [...messages, reply] })
    .eq("id", id);
  return NextResponse.json({ media: applied.media, subject: applied.subject, design: applied.design, concepts: applied.concepts, brief, ready, userMsg, reply });
}

// The user corrects what an image is (e.g. a logo read as a reference): it is prepared again.
export async function PATCH(req: Request, ctx: RouteContext<"/api/kits/[id]/media">) {
  const { id } = await ctx.params;
  const loaded = await load(id);
  if ("error" in loaded) return loaded.error;
  const { supabase, user, kit } = loaded;
  const { mediaId, role } = (await req.json()) as { mediaId?: string; role?: MediaRole };
  const target = kit.media.find((m) => m.id === mediaId);
  if (!target || !role || !MEDIA_ROLES.includes(role)) return NextResponse.json({ error: "לא נמצא" }, { status: 400 });
  try {
    const redone = await prepareMedia({ ...target, role }, `${user.id}/${id}`);
    const applied = applyMedia({ ...kit, media: kit.media.map((m) => (m.id === mediaId ? redone : m)) }, kit.media);
    await supabase.from("kits").update(applied).eq("id", id);
    return NextResponse.json(applied);
  } catch (e) {
    await alertOwner("media:failed", "עיבוד מחדש של תמונה נכשל", { kit: id, error: (e as Error).message });
    return NextResponse.json({ error: "לא הצלחנו לעבד את התמונה מחדש" }, { status: 502 });
  }
}

// Removes an image; a removed lecturer or logo leaves the designs too.
export async function DELETE(req: Request, ctx: RouteContext<"/api/kits/[id]/media">) {
  const { id } = await ctx.params;
  const loaded = await load(id);
  if ("error" in loaded) return loaded.error;
  const { supabase, kit } = loaded;
  const mediaId = new URL(req.url).searchParams.get("mediaId");
  const gone = kit.media.find((m) => m.id === mediaId);
  if (!gone) return NextResponse.json({ error: "לא נמצא" }, { status: 400 });
  const media = kit.media.filter((m) => m.id !== mediaId);
  const applied = applyMedia({ ...kit, media, subject: gone.role === "lecturer" && gone.cut ? null : kit.subject }, kit.media);
  // Without any lecturer left, the designs drop the removed one rather than keep it.
  if (gone.role === "lecturer" && !media.some((m) => m.role === "lecturer" && m.cut)) {
    const strip = (d: DesignProps) => (d.assets.subject?.src === gone.cut?.src ? { ...d, assets: { ...d.assets, subject: undefined } } : d);
    applied.design = applied.design ? strip(applied.design) : null;
    applied.concepts = applied.concepts?.map((c) => ({ ...c, design: strip(c.design) })) ?? null;
  }
  await supabase.from("kits").update(applied).eq("id", id);
  return NextResponse.json(applied);
}
