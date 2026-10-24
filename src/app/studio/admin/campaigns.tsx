"use client";

// Marketing campaigns in admin: write (or let the agent draft), save, send a test to yourself, send.
import { useActionState, useState, useTransition } from "react";
import { draftCampaign, saveCampaign, sendCampaign, testCampaign, type CampaignState } from "./actions";

export type CampaignRow = {
  id: string;
  subject: string;
  heading: string;
  body: string;
  button_label: string | null;
  button_url: string | null;
  segment: string;
  status: string;
  sent_at: string | null;
  sent_count: number;
  created_at: string;
};

export const SEGMENT_NAMES: Record<string, string> = { all: "כל מי שאישר דיוור", free: "במסלול החינמי", paid: "מנויים בתשלום", inactive: "לא פעילים 30 יום" };
const input = "w-full rounded-xl border border-border bg-bg px-3 py-2 outline-none focus:border-brand";
const empty = { id: "", subject: "", heading: "", body: "", button_label: "לסטודיו", button_url: "https://enigma-studios.co/studio", segment: "all" };

export function Campaigns({ rows, audience }: { rows: CampaignRow[]; audience: Record<string, number> }) {
  const [draft, setDraft] = useState(empty);
  const [state, save, saving] = useActionState(async (s: CampaignState, f: FormData) => {
    const r = await saveCampaign(s, f);
    if (r?.id) setDraft((d) => ({ ...d, id: r.id! }));
    return r;
  }, undefined);
  const [topic, setTopic] = useState("");
  const [note, setNote] = useState<CampaignState>(undefined);
  const [busy, start] = useTransition();
  const set = (k: keyof typeof empty) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setDraft((d) => ({ ...d, [k]: e.target.value }));

  const agent = () =>
    start(async () => {
      setNote(undefined);
      const r = await draftCampaign(topic);
      if ("error" in r) return setNote({ error: r.error });
      setDraft((d) => ({ ...d, subject: r.subject, heading: r.heading, body: r.body, button_label: r.button_label }));
    });
  const act = (fn: () => Promise<CampaignState>, confirmText?: string) => () => {
    if (confirmText && !confirm(confirmText)) return;
    start(async () => setNote(await fn()));
  };
  const saved = draft.id && rows.find((r) => r.id === draft.id)?.status === "draft";

  return (
    <div className="space-y-4">
      <div className="grid gap-3 rounded-2xl border border-border bg-surface p-5">
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex min-w-60 flex-1 flex-col gap-1 text-sm font-semibold">
            טיוטה מהסוכן: על מה הדיוור?
            <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="למשל: השקנו עורך סרטונים, ואפשר עכשיו לשלב קטעים מהשיעורים" className={input} />
          </label>
          <button type="button" onClick={agent} disabled={busy || !topic.trim()} className="rounded-full border border-brand px-4 py-2 text-sm font-bold text-brand hover:bg-brand/10 disabled:opacity-50">
            {busy ? "כותב…" : "✦ נסחו לי"}
          </button>
        </div>
        <form action={save} className="grid gap-3 md:grid-cols-2">
          <input type="hidden" name="id" value={draft.id} />
          <label className="flex flex-col gap-1 text-sm font-semibold">
            נושא (נוסף לו &quot;פרסומת:&quot; אוטומטית)
            <input name="subject" value={draft.subject} onChange={set("subject")} className={input} required />
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold">
            כותרת בתוך המייל
            <input name="heading" value={draft.heading} onChange={set("heading")} className={input} required />
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold md:col-span-2">
            תוכן (שורה ריקה בין פסקאות. השם של כל נמען נוסף בהתחלה)
            <textarea name="body" value={draft.body} onChange={set("body")} rows={7} className={input} required />
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold">
            טקסט הכפתור
            <input name="button_label" value={draft.button_label} onChange={set("button_label")} className={input} />
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold">
            קישור הכפתור
            <input name="button_url" value={draft.button_url} onChange={set("button_url")} dir="ltr" className={input} />
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold">
            למי
            <select name="segment" value={draft.segment} onChange={set("segment")} className={input}>
              {Object.entries(SEGMENT_NAMES).map(([k, v]) => (
                <option key={k} value={k}>
                  {v} ({audience[k] ?? 0})
                </option>
              ))}
            </select>
          </label>
          <div className="flex flex-wrap items-end gap-2">
            <button disabled={saving} className="rounded-full bg-brand px-5 py-2 text-sm font-bold text-white hover:bg-brand-strong disabled:opacity-50">
              {saving ? "שומר…" : "שמירת טיוטה"}
            </button>
            {saved && (
              <>
                <button type="button" onClick={act(() => testCampaign(draft.id))} disabled={busy} className="rounded-full border border-border px-4 py-2 text-sm font-bold hover:border-brand">
                  מייל בדיקה אליי
                </button>
                <button
                  type="button"
                  onClick={act(() => sendCampaign(draft.id), `לשלוח את הדיוור ל־${audience[draft.segment] ?? 0} נמענים (${SEGMENT_NAMES[draft.segment]})? אי אפשר לבטל אחרי השליחה.`)}
                  disabled={busy}
                  className="rounded-full bg-ok px-4 py-2 text-sm font-bold text-white hover:opacity-90"
                >
                  שליחה לכולם
                </button>
              </>
            )}
            {draft.id && (
              <button type="button" onClick={() => setDraft(empty)} className="px-2 py-2 text-sm text-muted hover:text-text">
                דיוור חדש
              </button>
            )}
          </div>
        </form>
        {[state, note].map((s, i) => s && (s.error ? <p key={i} className="text-sm text-danger">{s.error}</p> : s.done ? <p key={i} className="text-sm font-semibold text-ok">{s.done}</p> : null))}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="text-muted">
            <tr className="border-b border-border">
              {["נושא", "למי", "מצב", "נשלחו", "תאריך", ""].map((h) => (
                <th key={h} className="p-3 text-start font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-border last:border-0">
                <td className="p-3 font-semibold">{r.subject}</td>
                <td className="p-3">{SEGMENT_NAMES[r.segment] ?? r.segment}</td>
                <td className="p-3">{r.status === "sent" ? "נשלח" : r.status === "sending" ? "נשלח עכשיו…" : "טיוטה"}</td>
                <td className="p-3">{r.status === "draft" ? "—" : r.sent_count}</td>
                <td className="p-3">{new Date(r.sent_at ?? r.created_at).toLocaleDateString("he-IL")}</td>
                <td className="p-3">
                  <button
                    onClick={() => setDraft({ id: r.status === "draft" ? r.id : "", subject: r.subject, heading: r.heading, body: r.body, button_label: r.button_label ?? "", button_url: r.button_url ?? "", segment: r.segment })}
                    className="font-semibold text-brand hover:underline"
                  >
                    {r.status === "draft" ? "עריכה" : "שכפול"}
                  </button>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-muted">
                  עוד אין דיוורים.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
