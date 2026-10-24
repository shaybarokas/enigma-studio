// Transactional email through Resend (domain send.enigma-studios.co, key restricted to it).
// Without RESEND_API_KEY nothing is sent and callers carry on: email never blocks a flow.
export const EMAIL_FROM = "Enigma Studio <studio@send.enigma-studios.co>";

export type Email = { to: string; subject: string; html: string; text: string; headers?: Record<string, string> };

export async function sendEmail(e: Email): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, error: "RESEND_API_KEY is not set" };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: EMAIL_FROM, to: [e.to], subject: e.subject, html: e.html, text: e.text, ...(e.headers ? { headers: e.headers } : {}) }),
      signal: AbortSignal.timeout(10_000),
    });
    const body = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
    if (!res.ok || !body.id) return { ok: false, error: `${res.status} ${body.message ?? ""}`.trim() };
    return { ok: true, id: body.id };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

/** Sends and logs a failure; for flows where the email is a courtesy, not a requirement. */
export async function trySend(e: Email, tag: string) {
  const r = await sendEmail(e);
  if (!r.ok) console.error(`[email] ${tag} not sent:`, r.error);
  return r.ok;
}

/** Up to 100 emails in one request (Resend's batch). Returns each one's id, or null where it failed. */
export async function sendBatch(list: Email[]): Promise<(string | null)[]> {
  const key = process.env.RESEND_API_KEY;
  if (!key || !list.length) return list.map(() => null);
  try {
    const res = await fetch("https://api.resend.com/emails/batch", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(list.map((e) => ({ from: EMAIL_FROM, to: [e.to], subject: e.subject, html: e.html, text: e.text, ...(e.headers ? { headers: e.headers } : {}) }))),
      signal: AbortSignal.timeout(30_000),
    });
    const body = (await res.json().catch(() => ({}))) as { data?: { id: string }[]; message?: string };
    if (!res.ok || !body.data) {
      console.error("[email] batch failed:", res.status, body.message);
      return list.map(() => null);
    }
    return list.map((_, i) => body.data![i]?.id ?? null);
  } catch (err) {
    console.error("[email] batch failed:", (err as Error).message);
    return list.map(() => null);
  }
}
