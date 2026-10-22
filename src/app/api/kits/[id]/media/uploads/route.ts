import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getUserAndClient } from "@/lib/kits";
import { createAdminClient } from "@/lib/supabase/admin";

const MAX_FILES = 6;
const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic", "image/heif": "heif", "image/gif": "gif" };

// One-time upload links: the browser sends images straight to storage (a function can't receive
// a request over 4.5MB, and phone photos are bigger), then tells /media which paths to process.
export async function POST(req: Request, ctx: RouteContext<"/api/kits/[id]/media/uploads">) {
  const { id } = await ctx.params;
  const { supabase, user } = await getUserAndClient();
  if (!user) return NextResponse.json({ error: "צריך להתחבר" }, { status: 401 });
  const { data: kit } = await supabase.from("kits").select("id").eq("id", id).maybeSingle();
  if (!kit) return NextResponse.json({ error: "הערכה לא נמצאה" }, { status: 404 });
  const { types } = (await req.json()) as { types?: string[] };
  if (!types?.length || types.length > MAX_FILES) return NextResponse.json({ error: `אפשר עד ${MAX_FILES} תמונות בכל פעם` }, { status: 400 });
  if (types.some((t) => !t.startsWith("image/"))) return NextResponse.json({ error: "רק תמונות" }, { status: 400 });

  const storage = createAdminClient().storage.from("kit-assets");
  const uploads = await Promise.all(
    types.map(async (t) => {
      const path = `${user.id}/${id}/uploads/${randomUUID()}.${EXT[t] ?? "img"}`;
      const { data, error } = await storage.createSignedUploadUrl(path);
      if (error) throw error;
      return { path, token: data.token };
    }),
  );
  return NextResponse.json({ uploads });
}
