import { costContext } from "@/lib/costs";
import { NextResponse } from "next/server";
import { bundleVersion, warmRenderSnapshot } from "@/lib/render/sandbox";

export const maxDuration = 300;

// Prepares this deploy's render snapshot ahead of the first user. Called after each deploy.
export async function POST(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.RENDER_WARM_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  costContext({ action: "warm" });
  const snapshotId = await warmRenderSnapshot();
  return NextResponse.json({ version: bundleVersion(), snapshotId });
}
