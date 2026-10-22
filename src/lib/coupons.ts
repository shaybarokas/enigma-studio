// Coupon codes. Discount codes are checked here and consumed by the database when the
// discounted order is paid; kit codes are redeemed at once into a gift kit pass.
import { createAdminClient } from "./supabase/admin";

export type Coupon = { code: string; kind: "discount" | "kit"; percent: number | null; months: number; credits: number; max_uses: number | null; used: number; expires_at: string | null; active: boolean; note: string | null; created_at: string };

export const normalize = (code: string) => code.trim().toUpperCase().replace(/\s+/g, "");

const REASONS: Record<string, string> = {
  invalid: "הקוד לא מוכר. כדאי לבדוק שהוא הוקלד נכון.",
  expired: "תוקף הקוד הסתיים.",
  used_up: "הקוד כבר מומש במלואו.",
  already: "כבר השתמשת בקוד הזה.",
};
export const couponError = (reason: string) => REASONS[reason] ?? REASONS.invalid;

/** A discount code the user may still use; the reason when not. */
export async function findDiscount(raw: string, userId: string): Promise<{ ok: true; coupon: Coupon } | { ok: false; reason: string }> {
  const code = normalize(raw);
  const db = createAdminClient();
  const { data: c } = await db.from("coupons").select("*").eq("code", code).maybeSingle<Coupon>();
  if (!c || !c.active || c.kind !== "discount" || !c.percent) return { ok: false, reason: "invalid" };
  if (c.expires_at && new Date(c.expires_at) < new Date()) return { ok: false, reason: "expired" };
  if (c.max_uses != null && c.used >= c.max_uses) return { ok: false, reason: "used_up" };
  const { data: mine } = await db.from("coupon_redemptions").select("code").eq("code", code).eq("user_id", userId).maybeSingle();
  if (mine) return { ok: false, reason: "already" };
  return { ok: true, coupon: c };
}

/** Looks a code up for the plans page: a discount to apply at checkout, or a kit pass redeemed now. */
export async function applyCode(raw: string, userId: string) {
  const code = normalize(raw);
  const db = createAdminClient();
  const { data: c } = await db.from("coupons").select("kind").eq("code", code).maybeSingle<{ kind: Coupon["kind"] }>();
  if (!c) return { ok: false as const, error: couponError("invalid") };
  if (c.kind === "kit") {
    const { data: r } = await db.rpc("redeem_kit_coupon", { p_user: userId, p_code: code });
    return r === "ok" ? { ok: true as const, kind: "kit" as const } : { ok: false as const, error: couponError(r as string) };
  }
  const d = await findDiscount(code, userId);
  if (!d.ok) return { ok: false as const, error: couponError(d.reason) };
  return { ok: true as const, kind: "discount" as const, code, percent: d.coupon.percent!, months: d.coupon.months };
}
