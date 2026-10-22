// Plans, prices and what each one includes. Monthly allowances must match the database's
// plan_allowance(). Prices in ILS, VAT included; annual = 10 months.
import type { FormatId } from "@/engine/formats";

export type PlanId = "free" | "basic" | "pro" | "business";
export type PaidPlan = Exclude<PlanId, "free">;
export type Interval = "month" | "year";

export const PLANS: Record<
  PlanId,
  { name: string; credits: number; price: Record<Interval, number>; formats: FormatId[]; watermark: boolean; zip: boolean; videos: boolean }
> = {
  free: { name: "חינם", credits: 15, price: { month: 0, year: 0 }, formats: ["square", "story"], watermark: true, zip: false, videos: false },
  basic: { name: "בסיסי", credits: 100, price: { month: 79, year: 790 }, formats: ["landscape", "square", "portrait", "story"], watermark: false, zip: true, videos: true },
  pro: { name: "מקצועי", credits: 200, price: { month: 149, year: 1490 }, formats: ["landscape", "square", "portrait", "story"], watermark: false, zip: true, videos: true },
  business: { name: "מתקדם", credits: 450, price: { month: 299, year: 2990 }, formats: ["landscape", "square", "portrait", "story"], watermark: false, zip: true, videos: true },
};

/** What things cost, in credits. Downloads are free. */
export const COST = {
  concepts: 10, // three directions, with their AI scenes and props
  edit: 1, // a change through the chat
  editWithScene: 4, // a change that paints a new background
  video: 15, // a narrated, scored, rendered video
} as const;

/** Credit packs for when the month's allowance runs out. They never expire. */
export const PACKS = [
  { id: "p50", credits: 50, price: 49 },
  { id: "p150", credits: 150, price: 129 },
] as const;

export const PLAN_FEATURES: Record<PlanId, string[]> = {
  free: [`${PLANS.free.credits} קרדיטים בחודש: סבב כיוונים אחד ושינויים`, "הורדה בריבוע ובסטורי", "סרטון פרומו לדוגמה אחד", "חותמת Enigma Studio על התוצרים"],
  basic: [`${PLANS.basic.credits} קרדיטים בחודש`, "כל 4 הגדלים, בלי חותמת", "סרטוני פרומו ושיווק עם קריינות", "הורדת כל הערכה בקובץ אחד"],
  pro: [`${PLANS.pro.credits} קרדיטים בחודש`, "כל מה שבבסיסי", "מספיק לשתי השקות מלאות בחודש", "עדיפות בהפקה"],
  business: [`${PLANS.business.credits} קרדיטים בחודש`, "כל מה שבמקצועי", "לסוכנויות ולמי שמשיק כל הזמן", "ליווי אישי בהקמה"],
};

export const ils = (n: number) => `${new Intl.NumberFormat("he-IL", { maximumFractionDigits: 2 }).format(n)} ₪`;
