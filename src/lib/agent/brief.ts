// What the agent learns about the launch in the interview. Every field is nullable: the agent fills
// what it knows and asks only for what is missing.
import { z } from "zod";

export const briefSchema = z.object({
  kind: z.enum(["course", "workshop", "event", "service", "product", "other"]).nullable(),
  title: z.string().nullable().describe("שם המוצר/הקורס בעברית"),
  brandName: z.string().nullable().describe("שם מותג קיים, אם יש (למשל BRICK BOSS)"),
  lecturerName: z.string().nullable(),
  lecturerCredential: z.string().nullable().describe("מה נותן למרצה סמכות: ניסיון, הישגים"),
  audience: z.string().nullable(),
  pain: z.string().nullable().describe("הכאב או הבעיה של הקהל, במילים שלהם"),
  promise: z.string().nullable().describe("התוצאה/השינוי שהמוצר מבטיח"),
  uniqueness: z.string().nullable(),
  topics: z.array(z.string()).describe("נושאים/תוצרים מרכזיים, עד 6"),
  tone: z.string().nullable().describe("טון: יוקרתי, אנרגטי, רגיש, מקצועי, הומוריסטי…"),
  price: z.string().nullable(),
  offer: z.string().nullable().describe("מבצע, הנחה, דדליין"),
  cta: z.string().nullable(),
  link: z.string().nullable(),
  visualNotes: z.string().nullable().describe("צבעים, סגנונות שאוהבים או לא אוהבים, מותג קיים"),
  brandColors: z.array(z.string()).describe("צבעי מותג קיימים (#rrggbb), מהלוגו או ממה שהמשתמש אמר"),
});
export type Brief = z.infer<typeof briefSchema>;

export const emptyBrief: Brief = {
  kind: null,
  title: null,
  brandName: null,
  lecturerName: null,
  lecturerCredential: null,
  audience: null,
  pain: null,
  promise: null,
  uniqueness: null,
  topics: [],
  tone: null,
  price: null,
  offer: null,
  cta: null,
  link: null,
  visualNotes: null,
  brandColors: [],
};
