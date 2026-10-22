import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Owner-only check that every outside service accepts our keys (Bearer RENDER_WARM_SECRET).
// Each probe is a free read that fails on a bad key, so a broken environment shows up at once.
export async function GET(request: NextRequest) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.RENDER_WARM_SECRET}` || !process.env.RENDER_WARM_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const probe = async (name: string, run: () => Promise<boolean | string>) => {
    try {
      const r = await run();
      return [name, r === true ? "ok" : r === false ? "failed" : r] as const;
    } catch (e) {
      return [name, `error: ${(e as Error).message.slice(0, 80)}`] as const;
    }
  };
  const status = (res: Response) => (res.ok ? true : `HTTP ${res.status}`);
  const checks = await Promise.all([
    probe("anthropic", async () => status(await fetch("https://api.anthropic.com/v1/models?limit=1", { headers: { "x-api-key": process.env.ANTHROPIC_API_KEY ?? "", "anthropic-version": "2023-06-01" } }))),
    probe("elevenlabs", async () => status(await fetch("https://api.elevenlabs.io/v1/voices?page_size=1", { headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY ?? "" } }))),
    // fal has no free read: an unknown request id answers 404 with a good key and 401/403 with a bad one.
    probe("fal", async () => {
      const res = await fetch("https://queue.fal.run/fal-ai/flux-pro/requests/00000000-0000-0000-0000-000000000000/status", { headers: { Authorization: `Key ${process.env.FAL_KEY ?? ""}` } });
      return res.status === 401 || res.status === 403 ? `HTTP ${res.status}` : true;
    }),
    probe("supabase", async () => !(await createAdminClient().from("accounts").select("user_id", { head: true, count: "exact" })).error),
    probe("resend", async () => status(await fetch("https://api.resend.com/emails/00000000-0000-0000-0000-000000000000", { headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY ?? ""}` } })).toString().includes("401") ? "HTTP 401" : true),
    probe("payplus", async () => Boolean(process.env.PAYPLUS_API_KEY && process.env.PAYPLUS_SECRET_KEY)),
  ]);
  const result = Object.fromEntries(checks);
  return NextResponse.json({ ok: Object.values(result).every((v) => v === "ok"), ...result });
}
