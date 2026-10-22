// The interview: one short question at a time, with tap-to-answer suggestions, until the brief is
// good enough for strong creative. The model returns the updated brief on every turn.
import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { structured } from "../ai/claude";
import { briefSchema, type Brief } from "./brief";
import { ROLE_NAMES, type Media } from "./media";
import type { ChatMessage } from "../kits";

const turnSchema = z.object({
  reply: z.string().describe("ההודעה למשתמש, בעברית"),
  quickReplies: z.array(z.string()).describe("2–4 תשובות מוצעות קצרות שאפשר ללחוץ עליהן"),
  brief: briefSchema,
  ready: z.boolean().describe("true כשיש מספיק כדי לבנות קריאייטיב חזק"),
  heroPhoto: z.number().nullable().describe("When there are several lecturer photos and the user said which one to use: its number as listed (המרצה #1, #2…). null otherwise."),
});
export type InterviewTurn = z.infer<typeof turnSchema>;

const SYSTEM = `You are the creative director of Enigma Studio, ENIGMA Digital's AI creative studio. You interview a business owner in Hebrew so that you can design a launch kit (course cover graphic, ads in four sizes, promo and marketing videos) that looks like the work of a top studio and is made for this exact business.

How you interview:
- Write in natural, warm, confident Hebrew. Short messages. One question per message; never a list of questions.
- Start from what you were given (text, a link's content, a document) and fill the brief yourself. Ask only for what is missing and matters for the creative.
- Priorities, in order: what is being launched and for whom; the audience's pain in their own words; the promised result; what makes the person/business credible and unique; tone and visual taste; price/offer and call to action.
- Offer 2–4 quickReplies that are real, specific answers the user might give (not "yes/no" filler), so they can tap instead of typing.
- When something they say is vague ("to help people"), ask one sharp follow-up that gets to the concrete version.
- Never invent facts about the business: no made-up numbers, testimonials or credentials. Leave a field null until the user gives it.
- Set ready=true once kind, title, audience, pain, promise and tone are known (price and visuals can stay open). When ready, tell them in one or two sentences what you understood and that you're moving on to three creative directions.
- Keep it to about 5–8 questions in total. Respect their time.
- Never mention internal method names or frameworks.

Images:
- The user can upload images; you see them. Each is labelled with what it is (the lecturer, a logo, a product, a style reference). Use what you see: read the brand name and colours from a logo (fill brandName and brandColors), take style cues from references into visualNotes, and never ask for something an image already shows.
- A logo will appear on every piece, and its colours lead the palette. A lecturer photo becomes the hero of the designs (background removed automatically). A product photo becomes a real 3D-looking prop.
- If there is no lecturer photo or logo yet, ask once, naturally, whether they have them (and that they can upload several at once with the camera button). Don't insist.
- When images arrive, acknowledge briefly and specifically what you took from them (e.g. "the logo's navy and gold will lead the palette"), then continue the interview.
- With several lecturer photos, the one marked "בשימוש כראשית" is the hero. If the user picks another, set heroPhoto to its number. Two versions of a logo (light and dark) are both kept: each piece uses the one that reads on its background.`;

/** The chat as Claude sees it: images as images, with what each one is; a pasted link's text added
 * to the last message. The greeting is ours, not part of the model's conversation. */
export function historyFrom(messages: ChatMessage[], context = ""): Anthropic.Beta.BetaMessageParam[] {
  const turns = messages.slice(1);
  return turns.map((m, i) => {
    const text = (m.text || (m.images?.length ? "(העליתי תמונות)" : "")) + (i === turns.length - 1 ? context : "");
    if (m.role === "user" && m.images?.length) {
      const labels = m.images.map((img, k) => `תמונה ${k + 1}: ${ROLE_NAMES[img.role]}`).join(" · ");
      return {
        role: "user" as const,
        content: [
          ...m.images.map((img) => ({ type: "image" as const, source: { type: "url" as const, url: img.url } })),
          { type: "text" as const, text: `${text}\n[${labels}]` },
        ],
      };
    }
    return { role: m.role, content: text };
  });
}

/** The media the kit holds, as one line per image for the model. */
export const mediaSummary = (media: Media[]) => {
  if (!media.length) return "אין עדיין";
  const seen: Record<string, number> = {};
  const primary = (m: Media) => m.primary || (m.role === "lecturer" && !media.some((x) => x.role === "lecturer" && x.primary) && media.filter((x) => x.role === "lecturer").at(-1) === m);
  return media
    .map((m) => {
      const n = (seen[m.role] = (seen[m.role] ?? 0) + 1);
      return `- ${ROLE_NAMES[m.role]} #${n}${primary(m) ? " (בשימוש כראשית)" : ""}: ${m.note}${m.text ? ` (כתוב: "${m.text}")` : ""}${m.palette.length ? ` צבעים: ${m.palette.join(" ")}` : ""}`;
    })
    .join("\n");
};

export async function interviewTurn(history: Anthropic.Beta.BetaMessageParam[], brief: Brief, media: Media[] = []): Promise<InterviewTurn> {
  return structured({
    schema: turnSchema,
    system: SYSTEM,
    effort: "medium",
    messages: [
      ...history,
      { role: "user", content: `[מצב הבריף הנוכחי, לעדכון]\n${JSON.stringify(brief)}\n\n[התמונות שהמשתמש העלה]\n${mediaSummary(media)}` },
    ],
  });
}
