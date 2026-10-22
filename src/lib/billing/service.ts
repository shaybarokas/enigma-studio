// Orders, payment confirmation and renewals. The database functions (complete_order,
// renew_account, renewal_failed, downgrade_to_free) do the account changes atomically.
import { createAdminClient } from "../supabase/admin";
import { PACKS, PLANS, ils, type Interval, type PaidPlan } from "../plans";
import { trySend } from "../email/send";
import { billingEmails } from "../email/templates";
import { chargeToken, createTaxInvoice, generatePaymentLink, lookupPaymentRequest, transactionDocuments, txnSummary, type ParsedTransaction } from "./payplus";

const UUID = /^[0-9a-f-]{36}$/;

export type Purchase = { kind: "subscribe"; plan: PaidPlan; interval: Interval } | { kind: "pack"; pack: string };

export const planName = (plan: PaidPlan, interval: Interval | null) => `Enigma Studio · מסלול ${PLANS[plan].name}${interval === "year" ? " (שנתי)" : ""}`;
/** The plan as the customer reads it in an email: "מסלול מקצועי (שנתי)". */
const planLabel = (plan: PaidPlan, interval: Interval | null) => `מסלול ${PLANS[plan].name}${interval === "year" ? " (שנתי)" : ""}`;

async function contact(userId: string) {
  const { data } = await createAdminClient().auth.admin.getUserById(userId);
  const email = data.user?.email ?? "";
  return { email, name: (data.user?.user_metadata?.full_name as string | undefined) || null };
}

type BillingMail = keyof typeof billingEmails;
async function notify(userId: string, kind: BillingMail, v: Omit<Parameters<(typeof billingEmails)[BillingMail]>[0], "name">) {
  const c = await contact(userId);
  if (c.email) await trySend({ to: c.email, ...billingEmails[kind]({ ...v, name: c.name }) }, `billing:${kind}`);
}

/** Creates the order and its PayPlus payment page; returns the link to send the customer to. */
export async function checkout(user: { id: string; email: string; name: string }, p: Purchase, origin: string) {
  let amount: number, itemName: string, credits: number | null = null;
  if (p.kind === "subscribe") {
    if (!(p.plan in PLANS) || p.plan === ("free" as string) || !["month", "year"].includes(p.interval)) return { ok: false as const, error: "מסלול לא מוכר" };
    amount = PLANS[p.plan].price[p.interval];
    itemName = planName(p.plan, p.interval);
  } else {
    const pack = PACKS.find((x) => x.id === p.pack);
    if (!pack) return { ok: false as const, error: "חבילה לא מוכרת" };
    amount = pack.price;
    credits = pack.credits;
    itemName = `Enigma Studio · ${pack.credits} קרדיטים`;
  }

  const db = createAdminClient();
  const { data: order, error } = await db
    .from("orders")
    .insert({ user_id: user.id, kind: p.kind, plan: p.kind === "subscribe" ? p.plan : null, billing_interval: p.kind === "subscribe" ? p.interval : null, credits, amount })
    .select("id")
    .single();
  if (error) return { ok: false as const, error: "לא הצלחנו לפתוח הזמנה. נסו שוב." };

  const back = `${origin}/studio/billing/return?order=${order.id}`;
  const link = await generatePaymentLink({
    orderId: order.id,
    amount,
    itemName,
    customer: { name: user.name, email: user.email },
    successUrl: back,
    failureUrl: `${back}&status=failed`,
    cancelUrl: `${origin}/studio/billing`,
    callbackUrl: `${origin}/api/billing/payplus`,
  });
  if (!link.ok) {
    console.error("[billing] link failed", order.id, link.error);
    return { ok: false as const, error: "עמוד התשלום לא נפתח. נסו שוב בעוד רגע." };
  }
  await db.from("orders").update({ page_request_uid: link.pageRequestUid }).eq("id", order.id);
  return { ok: true as const, link: link.link };
}

/** A paid payment-page transaction (from the callback or the return page). Idempotent: the
 * database completes an order once, and only that call sends the confirmation email. */
export async function completeOrder(t: ParsedTransaction): Promise<string> {
  if (!t.ok || !t.orderId || !t.transactionUid) return "not_paid";
  const db = createAdminClient();
  const { data, error } = await db.rpc("complete_order", {
    p_order: t.orderId,
    p_transaction: t.transactionUid,
    p_amount: t.amount,
    p_customer: t.customerUid,
    p_token: t.token,
    p_terminal: t.terminalUid,
    p_cashier: t.cashierUid,
    p_last4: t.last4,
    p_invoice: t.invoiceUrl,
  });
  if (error) {
    console.error("[billing] complete failed: customer paid, account not updated", t.orderId, t.transactionUid, error.message);
    return "error";
  }
  if (data !== "ok" && data !== "already" && data !== "no_token") console.error("[billing] paid but not completed", t.orderId, t.transactionUid, data);
  if (data !== "ok") return data as string;

  // The IPN lookup (return page) carries no invoice: fetch the one PayPlus issued for the payment.
  if (!t.invoiceUrl) {
    const docs = await transactionDocuments(t.transactionUid);
    const url = docs[0]?.original_doc_url ?? docs[0]?.copy_doc_url;
    if (url) await db.from("orders").update({ invoice_url: url }).eq("id", t.orderId);
    else console.error("[billing] no invoice found for payment", t.orderId, t.transactionUid);
  }

  const { data: o } = await db.from("orders").select("user_id, kind, plan, billing_interval, credits, amount").eq("id", t.orderId).single();
  if (o?.kind === "subscribe") {
    const { data: a } = await db.from("accounts").select("period_end").eq("user_id", o.user_id).single();
    await notify(o.user_id, "subscribed", { plan: planLabel(o.plan, o.billing_interval), amount: ils(Number(o.amount)), date: a?.period_end, credits: PLANS[o.plan as PaidPlan].credits });
  } else if (o?.kind === "pack") {
    await notify(o.user_id, "pack", { plan: "", amount: ils(Number(o.amount)), credits: o.credits });
  }
  return "ok";
}

/** Confirms an order straight with PayPlus (the customer returned before the callback). Safe without
 * a session (a cross-site POST back from PayPlus carries no cookies): it only asks PayPlus. */
export async function settleOrder(orderId: string): Promise<"paid" | "pending" | "unknown"> {
  if (!UUID.test(orderId)) return "unknown";
  const { data: order } = await createAdminClient().from("orders").select("status, page_request_uid").eq("id", orderId).maybeSingle();
  if (!order) return "unknown";
  if (order.status === "paid") return "paid";
  if (!order.page_request_uid) return "pending";
  const res = await lookupPaymentRequest(order.page_request_uid);
  if (!res.ok || !res.txn.ok) {
    console.error("[billing] ipn not approved", orderId, res.ok ? JSON.stringify(txnSummary(res.txn, res.raw)) : res.error);
    return "pending";
  }
  const done = await completeOrder({ ...res.txn, orderId });
  return done === "ok" || done === "already" ? "paid" : "pending";
}

/** Sent when the customer cancels in the studio. */
export async function notifyCancelled(userId: string) {
  const { data: a } = await createAdminClient().from("accounts").select("plan, billing_interval, period_end").eq("user_id", userId).single();
  if (a && a.plan !== "free") await notify(userId, "cancelled", { plan: planLabel(a.plan, a.billing_interval), date: a.period_end });
}

type Action = "charge" | "expire" | "remind";

/** Daily: reminders, renewals, ended plans. Each account is handled on its own. */
export async function runBillingCron() {
  const { data: due, error } = await createAdminClient().rpc("billing_due");
  if (error) throw new Error(error.message);
  const results: Record<string, string> = {};
  for (const row of (due ?? []) as { user_id: string; action: Action }[]) {
    try {
      results[`${row.user_id}:${row.action}`] = await handle(row.user_id, row.action);
    } catch (e) {
      results[`${row.user_id}:${row.action}`] = `error: ${(e as Error).message}`;
      console.error("[billing] cron item", row.user_id, row.action, (e as Error).message);
    }
  }
  return results;
}

async function handle(userId: string, action: Action) {
  const db = createAdminClient();
  const { data: a } = await db.from("accounts").select("*").eq("user_id", userId).single();
  const plan = planLabel(a.plan, a.billing_interval);
  const amount = Number(a.price_ils);

  if (action === "remind") {
    await notify(userId, "reminder", { plan, amount: ils(amount), date: a.period_end });
    await db.from("accounts").update({ reminded_for: a.period_end }).eq("user_id", userId);
    return "reminded";
  }
  if (action === "expire") {
    await db.rpc("downgrade_to_free", { p_user: userId });
    await notify(userId, "ended", { plan });
    return "ended";
  }

  const { email, name } = await contact(userId);
  const itemName = planName(a.plan, a.billing_interval);
  const res = await chargeToken({
    token: a.payplus_token,
    customerUid: a.payplus_customer_uid ?? "",
    terminalUid: a.payplus_terminal_uid ?? "",
    cashierUid: a.payplus_cashier_uid ?? "",
    amount,
    itemName,
    customerName: name ?? email,
    userId,
  });
  if (!res.ok) {
    console.error("[billing] renewal failed", userId, res.error);
    const { data } = await db.rpc("renewal_failed", { p_user: userId });
    await notify(userId, data === "downgraded" ? "downgraded" : "failed", { plan, amount: ils(amount) });
    return data as string;
  }
  // Token charges don't always get an invoice automatically: check, and issue one if missing.
  let invoiceUrl = res.invoiceUrl;
  if (!invoiceUrl) {
    await new Promise((r) => setTimeout(r, 3000));
    const docs = await transactionDocuments(res.transactionUid);
    invoiceUrl = docs[0]?.original_doc_url ?? docs[0]?.copy_doc_url ?? null;
    if (!invoiceUrl) {
      const doc = await createTaxInvoice({ transactionUid: res.transactionUid, customerUid: a.payplus_customer_uid, customerName: name ?? email, email, amount, itemName, last4: a.card_last4 });
      if (doc.ok) invoiceUrl = doc.url;
      else console.error("[billing] invoice missing: issue manually in Invoice+", res.transactionUid, doc.error);
    }
  }
  await db.rpc("renew_account", { p_user: userId, p_transaction: res.transactionUid, p_amount: amount, p_invoice: invoiceUrl });
  const { data: after } = await db.from("accounts").select("period_end").eq("user_id", userId).single();
  await notify(userId, "renewed", { plan, amount: ils(amount), date: after?.period_end });
  return "renewed";
}
