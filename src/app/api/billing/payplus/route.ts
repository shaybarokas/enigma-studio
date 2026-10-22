import { NextResponse, type NextRequest } from "next/server";
import { parseTransaction, verifyCallback } from "@/lib/billing/payplus";
import { completeOrder } from "@/lib/billing/service";

// PayPlus server-to-server callback (refURL_callback is set per request). Verified by PayPlus's
// HMAC; the order id travels in more_info. Idempotent.
export async function POST(request: NextRequest) {
  const raw = await request.text();
  if (!verifyCallback(raw, request.headers)) {
    console.error("[billing] callback with a bad signature", request.headers.get("user-agent"), raw.length);
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const t = parseTransaction(body);
  // Payments from Enigma's other products never carry our order id: acknowledge and ignore.
  if (!t.orderId || !/^[0-9a-f-]{36}$/.test(t.orderId)) return NextResponse.json({ ok: true, ignored: true });
  const result = await completeOrder(t);
  return NextResponse.json({ ok: result !== "error", result });
}
