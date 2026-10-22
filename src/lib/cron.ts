import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

/** Vercel cron calls carry Authorization: Bearer $CRON_SECRET. */
export function cronAuthorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const given = request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  return Boolean(secret) && given.length === secret!.length && timingSafeEqual(Buffer.from(given), Buffer.from(secret!));
}
