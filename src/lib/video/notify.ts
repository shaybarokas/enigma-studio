// A video takes minutes to produce and the user may have left the studio: the outcome reaches them
// by email too. Never blocks or fails a production.
import { contactOf } from "../email/contact";
import { trySend } from "../email/send";
import { appUrl, videoEmails } from "../email/templates";

const NAMES = { promo: "סרטון הפרומו", marketing: "סרטון השיווק" } as const;

export async function notifyVideo(o: { userId: string; kitId: string; kind: keyof typeof NAMES; edited?: boolean; failed?: { credits: number } }) {
  try {
    const c = await contactOf(o.userId);
    if (!c.email) return;
    const video = o.edited ? `הגרסה הערוכה של ${NAMES[o.kind]}` : NAMES[o.kind];
    const url = appUrl(`/studio/${o.kitId}`);
    const mail = o.failed ? videoEmails.failed(c.name, video, url, o.failed.credits) : videoEmails.ready(c.name, video, url);
    await trySend({ to: c.email, ...mail }, `video:${o.failed ? "failed" : "ready"}`);
  } catch (e) {
    console.error("[video:notify]", (e as Error).message);
  }
}
