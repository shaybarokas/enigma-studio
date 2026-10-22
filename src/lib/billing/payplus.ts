import { createHmac, timingSafeEqual } from "node:crypto";

// PayPlus REST client (https://docs.payplus.co.il). Server-side only.
// Same PayPlus account and "Enigma Academy New" payment page as Enigma's other products, never
// changed: every request overrides what matters (amount, items, redirects, callback, token).
// Our transactions are tagged more_info_1 = "enigma-studio".

const BASE = process.env.PAYPLUS_ENV === "staging" ? "https://restapidev.payplus.co.il/api/v1.0" : "https://restapi.payplus.co.il/api/v1.0";
export const PAYMENT_PAGE_UID = process.env.PAYPLUS_PAYMENT_PAGE_UID ?? "1e598968-eacf-4503-aab9-78eb1e1728c6";

export function payplusConfigured() {
  return Boolean(process.env.PAYPLUS_API_KEY && process.env.PAYPLUS_SECRET_KEY);
}

type Json = Record<string, unknown>;

async function call<T = Json>(path: string, body?: Json, method: "POST" | "GET" = "POST"): Promise<{ ok: true; data: T } | { ok: false; error: string; status?: number; data?: unknown }> {
  try {
    const res = await fetch(`${BASE}/${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        "api-key": process.env.PAYPLUS_API_KEY ?? "",
        "secret-key": process.env.PAYPLUS_SECRET_KEY ?? "",
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(30_000),
      cache: "no-store",
    });
    const text = await res.text();
    let data: unknown = text;
    try {
      data = JSON.parse(text);
    } catch {
      /* some errors are plain text */
    }
    const results = (data as { results?: { status?: string; description?: string } })?.results;
    if (!res.ok || (results && results.status && results.status !== "success")) {
      return { ok: false, status: res.status, error: results?.description ?? (typeof data === "string" ? data.slice(0, 300) : `HTTP ${res.status}`), data };
    }
    return { ok: true, data: data as T };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export type LinkRequest = {
  orderId: string;
  amount: number;
  itemName: string;
  customer: { name: string; email: string };
  successUrl: string;
  failureUrl: string;
  cancelUrl: string;
  callbackUrl: string;
};

// A one-time charge (J4) that also saves the card as a token for our monthly charges,
// and issues the tax invoice through Invoice+.
export async function generatePaymentLink(r: LinkRequest) {
  const res = await call<{ data: { page_request_uid: string; payment_page_link: string } }>("PaymentPages/generateLink", {
    payment_page_uid: PAYMENT_PAGE_UID,
    charge_method: 1,
    create_token: true,
    amount: r.amount,
    currency_code: "ILS",
    language_code: "he",
    sendEmailApproval: true,
    sendEmailFailure: false,
    initial_invoice: true,
    paying_vat: true,
    expiry_datetime: "60",
    refURL_success: r.successUrl,
    refURL_failure: r.failureUrl,
    refURL_cancel: r.cancelUrl,
    refURL_callback: r.callbackUrl,
    send_failure_callback: false,
    payments: 1,
    hide_payments_field: true,
    more_info: r.orderId,
    more_info_1: "enigma-studio",
    customer: { customer_name: r.customer.name, email: r.customer.email },
    items: [{ name: r.itemName, quantity: 1, price: r.amount, vat_type: 0 }],
  });
  if (!res.ok) return res;
  return { ok: true as const, pageRequestUid: res.data.data.page_request_uid, link: res.data.data.payment_page_link };
}

export type ChargeRequest = {
  token: string;
  customerUid: string;
  terminalUid: string;
  cashierUid: string;
  amount: number;
  itemName: string;
  customerName: string;
  userId: string;
};

// Monthly/annual renewal: charge the saved card (J4) and issue the invoice.
export async function chargeToken(r: ChargeRequest) {
  const res = await call<{ data: { transaction: { uid: string; status_code: string }; invoice?: { original_url?: string } } }>("Transactions/Charge", {
    terminal_uid: r.terminalUid,
    cashier_uid: r.cashierUid,
    amount: r.amount,
    currency_code: "ILS",
    credit_terms: 1,
    use_token: true,
    token: r.token,
    customer_uid: r.customerUid,
    initial_invoice: true,
    customer_name_invoice: r.customerName,
    products: [{ name: r.itemName, quantity: "1", price: String(r.amount), currency_code: "ILS", vat_type: "0" }],
    more_info_1: "enigma-studio",
    more_info_2: r.userId,
  });
  if (!res.ok) return res;
  const t = res.data.data.transaction;
  if (t.status_code !== "000") return { ok: false as const, error: `status ${t.status_code}` };
  return { ok: true as const, transactionUid: t.uid, invoiceUrl: res.data.data.invoice?.original_url ?? null };
}

// Look up a payment-page transaction (used when the customer returns before our callback).
export async function lookupPaymentRequest(pageRequestUid: string) {
  const res = await call("PaymentPages/ipn", { payment_request_uid: pageRequestUid, related_transaction: true });
  if (!res.ok) return res;
  return { ok: true as const, txn: parseTransaction(res.data), raw: res.data };
}

// ---------- callbacks ----------

export type ParsedTransaction = {
  ok: boolean;
  transactionUid: string | null;
  pageRequestUid: string | null;
  orderId: string | null;
  amount: number;
  customerUid: string | null;
  token: string | null;
  terminalUid: string | null;
  cashierUid: string | null;
  last4: string | null;
  expiry: string | null;
  invoiceUrl: string | null;
};

const str = (v: unknown) => (typeof v === "string" && v ? v : typeof v === "number" ? String(v) : null);

// PayPlus sends different shapes: the callback nests { transaction, data: { card_information } },
// while the IPN lookup (PaymentPages/ipn) returns one flat object under `data`
// ({ transaction_uid, page_request_uid, status_code, four_digits, ... }). Read all of them.
export function parseTransaction(body: unknown): ParsedTransaction {
  const root = (body ?? {}) as Json;
  const inner = ((root.data as Json | undefined)?.transaction ? root.data : root) as Json;
  const d = ((inner.data ?? root.data ?? {}) as Json) || {};
  const nested = (inner.transaction ?? root.transaction) as Json | undefined;
  const flat = !nested && d.transaction_uid !== undefined;
  const t = flat
    ? { uid: d.transaction_uid, status_code: d.status_code, payment_page_request_uid: d.page_request_uid, more_info: d.more_info, amount: d.amount }
    : ((nested ?? {}) as Json);
  const card = ((d.card_information ?? inner.card_information ?? root.card_information ?? (flat ? d : {})) as Json) || {};
  const invoice = ((root.invoice ?? inner.invoice ?? {}) as Json) || {};
  const mm = str(card.expiry_month);
  const yy = str(card.expiry_year);
  return {
    ok: str(t.status_code) === "000",
    transactionUid: str(t.uid),
    pageRequestUid: str(t.payment_page_request_uid) ?? str(t.payment_request_uid),
    orderId: str(t.more_info),
    amount: Number(t.amount ?? 0),
    customerUid: str(d.customer_uid),
    token: str(card.token) ?? str(d.token_uid) ?? str(d.token),
    terminalUid: str(d.terminal_uid),
    cashierUid: str(d.cashier_uid),
    last4: str(card.four_digits),
    expiry: mm && yy ? `${mm}/${yy}` : null,
    invoiceUrl: str(invoice.original_url),
  };
}

// What is safe to log about a PayPlus response: no names, ID numbers or card details.
export function txnSummary(t: ParsedTransaction, raw: unknown) {
  const d = ((raw as Json | undefined)?.data ?? {}) as Json;
  return { ok: t.ok, status: str(d.status), status_code: str(d.status_code) ?? null, amount: t.amount, transaction: t.transactionUid, has_token: Boolean(t.token) };
}

// Callbacks carry user-agent "PayPlus" and hash = base64(HMAC-SHA256(secret, body)).
// PayPlus's sample hashes the re-serialized JSON; accept either that or the raw bytes.
export function verifyCallback(rawBody: string, headers: Headers): boolean {
  const secret = process.env.PAYPLUS_SECRET_KEY;
  const hash = headers.get("hash");
  if (!secret || !hash || headers.get("user-agent") !== "PayPlus") return false;
  const candidates = [rawBody];
  try {
    candidates.push(JSON.stringify(JSON.parse(rawBody)));
  } catch {
    return false;
  }
  const given = Buffer.from(hash);
  return candidates.some((msg) => {
    const expected = Buffer.from(createHmac("sha256", secret).update(msg).digest("base64"));
    return expected.length === given.length && timingSafeEqual(expected, given);
  });
}

// ---------- Invoice+ ----------

type DocList = { invoices?: { status?: string; original_doc_url?: string; copy_doc_url?: string }[] };

export async function transactionDocuments(transactionUid: string) {
  const today = new Date().toISOString().slice(0, 10);
  const res = await call<DocList>("Invoice/GetDocuments", { transaction_uid: transactionUid, filter: { fromDate: today, untilDate: today } });
  if (!res.ok) return [];
  return (res.data.invoices ?? []).filter((d) => d.status === "success");
}

export type TaxInvoice = {
  transactionUid: string;
  customerUid: string | null;
  customerName: string;
  email: string;
  amount: number;
  itemName: string;
  last4: string | null;
  preview?: boolean; // validate without issuing a document
};

// Tax invoice-receipt (חשבונית מס קבלה) for a token charge, VAT included. The transaction
// uid is the unique identifier, so a retry can never issue a second document.
export async function createTaxInvoice(i: TaxInvoice) {
  const res = await call<{ docUID?: string; originalDocAddress?: string; copyDocAddress?: string }>("books/docs/new/inv_tax_receipt", {
    transaction_uuid: i.transactionUid,
    unique_identifier: `enigma-studio:${i.transactionUid}`,
    preview: i.preview ?? false,
    language: "he",
    currency_code: "ILS",
    vatType: "vat-type-included",
    send_document_email: true,
    more_info: "enigma-studio",
    customer: i.customerUid ? { customer_uid: i.customerUid, name: i.customerName, email: i.email } : { name: i.customerName, email: i.email },
    items: [{ name: i.itemName, price: i.amount, quantity: 1, vat_type_code: "vat-type-included" }],
    payments: [{ payment_type: "credit-card", amount: i.amount, four_digits: i.last4 ?? undefined, transaction_type: "normal" }],
    totalAmount: i.amount,
  });
  if (!res.ok) return res;
  return { ok: true as const, url: res.data.originalDocAddress ?? res.data.copyDocAddress ?? null, raw: res.data };
}
