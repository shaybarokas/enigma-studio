// Tells the studio's owner, by email, when something that costs money or customers goes wrong.
// Each key mails at most once an hour (the database counts the repeats in between); it never
// throws, so an alert can't break the flow it reports on.
import { sendEmail } from "./email/send";
import { esc } from "./email/templates";
import { createAdminClient } from "./supabase/admin";

const TO = (process.env.ALERT_EMAIL ?? process.env.ADMIN_EMAILS ?? "shaybarokas@gmail.com").split(",")[0].trim();

export async function alertOwner(key: string, message: string, details: Record<string, unknown> = {}) {
  console.error(`[alert] ${key}: ${message}`, JSON.stringify(details));
  try {
    const { data: held } = await createAdminClient().rpc("alert_due", { p_key: key });
    if (typeof held !== "number" || held < 0) return;
    const rows = Object.entries(details)
      .map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#6b6880">${esc(k)}</td><td style="padding:4px 0;font-family:monospace" dir="ltr">${esc(String(v))}</td></tr>`)
      .join("");
    const more = held > 0 ? `<p style="color:#6b6880">ועוד ${held} פעמים מאז ההתראה הקודמת.</p>` : "";
    await sendEmail({
      to: TO,
      subject: `⚠️ Enigma Studio: ${message}`,
      html: `<div dir="rtl" style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6"><p><strong>${esc(message)}</strong></p>${more}<table>${rows}</table><p style="color:#6b6880;font-size:12px">קוד התראה: ${esc(key)}. התראה מאותו סוג נשלחת לכל היותר פעם בשעה.</p></div>`,
      text: `${message}\n${held > 0 ? `ועוד ${held} פעמים מאז ההתראה הקודמת.\n` : ""}${Object.entries(details).map(([k, v]) => `${k}: ${v}`).join("\n")}\n(${key})`,
    });
  } catch (e) {
    console.error("[alert] not sent", (e as Error).message);
  }
}
