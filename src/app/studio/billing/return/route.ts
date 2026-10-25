import { NextResponse, type NextRequest } from "next/server";
import { settleOrder } from "@/lib/billing/service";

// PayPlus sends the customer back here (GET or POST, per the page's settings). We confirm the
// payment with PayPlus ourselves, then redirect (303 = always GET) to the plans page.
async function handle(request: NextRequest) {
  const order = request.nextUrl.searchParams.get("order") ?? "";
  const target = new URL("/studio/billing", request.nextUrl.origin);
  if (request.nextUrl.searchParams.get("status") === "failed") target.searchParams.set("status", "failed");
  else {
    const status = await settleOrder(order);
    target.searchParams.set("status", status === "paid" ? "paid" : "pending");
    // The plans page reports the confirmed payment to the Meta pixel (it re-checks the order itself).
    if (status === "paid") target.searchParams.set("order", order);
  }
  return NextResponse.redirect(target, 303);
}

export const GET = handle;
export const POST = handle;
