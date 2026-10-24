// Sends marketing email in batches and logs each one, so a step or a campaign never reaches the
// same person twice (email_log is unique per user and kind).
import { createAdminClient } from "../supabase/admin";
import { marketingEmail, type Recipient } from "./marketing";
import { sendBatch } from "./send";
import type { Mail } from "./templates";

export async function deliver(list: { r: Recipient; kind: string; mail: Omit<Mail, "footer"> }[]) {
  const db = createAdminClient();
  let sent = 0;
  for (let i = 0; i < list.length; i += 100) {
    const chunk = list.slice(i, i + 100);
    const ids = await sendBatch(chunk.map((x) => marketingEmail(x.r, x.mail)));
    const rows = chunk.flatMap((x, k) => (ids[k] ? [{ user_id: x.r.user_id, kind: x.kind, resend_id: ids[k] }] : []));
    if (rows.length) await db.from("email_log").upsert(rows, { onConflict: "user_id,kind", ignoreDuplicates: true });
    sent += rows.length;
    if (i + 100 < list.length) await new Promise((r) => setTimeout(r, 1000)); // Resend's request rate
  }
  return sent;
}
