"use server";

import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/admin";
import { normalize } from "@/lib/coupons";
import { getUserAndClient } from "@/lib/kits";
import { createAdminClient } from "@/lib/supabase/admin";

export type AdminState = { error?: string; done?: string } | undefined;

async function guard() {
  const { user } = await getUserAndClient();
  if (!isAdmin(user)) throw new Error("forbidden");
}

const int = (v: FormDataEntryValue | null) => {
  const n = Number(String(v ?? "").trim());
  return Number.isFinite(n) && String(v ?? "").trim() !== "" ? Math.round(n) : null;
};

export async function createCoupon(_: AdminState, f: FormData): Promise<AdminState> {
  await guard();
  const kind = f.get("kind") === "kit" ? "kit" : "discount";
  const typed = normalize(String(f.get("code") ?? ""));
  const code = typed || `${kind === "kit" ? "GIFT" : "ENIGMA"}-${crypto.randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase()}`;
  if (!/^[A-Z0-9-]{4,40}$/.test(code)) return { error: "קוד: 4–40 תווים, אותיות באנגלית, ספרות ומקף." };
  const percent = int(f.get("percent"));
  const months = int(f.get("months")) ?? 12;
  const credits = int(f.get("credits")) ?? 0;
  const maxUses = int(f.get("max_uses"));
  const expires = String(f.get("expires") ?? "").trim();
  if (kind === "discount" && (!percent || percent < 1 || percent > 100)) return { error: "אחוז הנחה בין 1 ל־100." };
  if (kind === "kit" && (credits < 0 || credits > 1000)) return { error: "קרדיטים לערכה: 0 עד 1000." };
  const { error } = await createAdminClient()
    .from("coupons")
    .insert({
      code,
      kind,
      percent: kind === "discount" ? percent : null,
      months,
      credits: kind === "kit" ? credits : 0,
      max_uses: maxUses,
      expires_at: expires ? new Date(`${expires}T23:59:59+03:00`).toISOString() : null,
      note: String(f.get("note") ?? "").trim() || null,
    });
  if (error) return { error: error.code === "23505" ? "הקוד הזה כבר קיים." : error.message };
  revalidatePath("/studio/admin");
  return { done: `הקוד ${code} נוצר. אפשר להעתיק אותו מהטבלה.` };
}

export async function toggleCoupon(code: string, active: boolean) {
  await guard();
  await createAdminClient().from("coupons").update({ active }).eq("code", code);
  revalidatePath("/studio/admin");
}
