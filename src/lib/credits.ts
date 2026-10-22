// The account and its credits, on the server. Spending is atomic in the database
// (spend_credits); a failed paid action gives the credits back (refund_credits).
import { PLANS, type PlanId } from "./plans";
import { createAdminClient } from "./supabase/admin";

export type Account = {
  plan: PlanId;
  monthly_credits: number;
  extra_credits: number;
  period_end: string;
  free_video_used: boolean;
  status: string;
};

export async function getAccount(userId: string): Promise<Account> {
  const db = createAdminClient();
  await db.rpc("refill_if_due", { p_user: userId });
  const { data } = await db
    .from("accounts")
    .select("plan, monthly_credits, extra_credits, period_end, free_video_used, status")
    .eq("user_id", userId)
    .maybeSingle();
  if (data) return data as Account;
  // An account made before accounts existed: create it on first use.
  await db.from("accounts").insert({ user_id: userId });
  return { plan: "free", monthly_credits: PLANS.free.credits, extra_credits: 0, period_end: new Date().toISOString(), free_video_used: false, status: "active" };
}

export const balance = (a: Account) => a.monthly_credits + a.extra_credits;

export const NOT_ENOUGH = "אין מספיק קרדיטים לפעולה הזו. אפשר לשדרג מסלול או להוסיף חבילת קרדיטים.";

/** Spends credits; false when the balance is short. */
export async function spend(userId: string, amount: number, reason: string, ref?: string): Promise<boolean> {
  const { data, error } = await createAdminClient().rpc("spend_credits", { p_user: userId, p_amount: amount, p_reason: reason, p_ref: ref ?? null });
  if (error) throw new Error(`credits: ${error.message}`);
  return (data as number) >= 0;
}

export async function refund(userId: string, amount: number, ref?: string) {
  await createAdminClient().rpc("refund_credits", { p_user: userId, p_amount: amount, p_ref: ref ?? null });
}
