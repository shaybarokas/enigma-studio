import type { DesignProps } from "../design";
import { withFonts } from "../with-fonts";
import { AdHook } from "./ad-hook";
import { AdList } from "./ad-list";
import { CinematicPoster } from "./cinematic-poster";
import { HeadlineImpact } from "./headline-impact";
import { StudioProps } from "./studio-props";

export type TemplateKind = "cover" | "ad";

/** Every template the engine and the agent can choose from. */
export const TEMPLATES = {
  "cinematic-poster": {
    name: "פוסטר קולנועי",
    kind: "cover",
    component: withFonts(CinematicPoster),
    fits: "שם מותג חזק, מרצה בתנוחת סמכות, תחומים רציניים ויוקרתיים (נדל״ן, פיננסים, עסקים)",
  },
  "headline-impact": {
    name: "כותרת ענק",
    kind: "cover",
    component: withFonts(HeadlineImpact),
    fits: "משפט עברי חזק שתופס (שאלה, טענה נועזת), תחומים רגשיים או דרמטיים (פסיכולוגיה, שפת גוף, טיפול)",
  },
  "studio-props": {
    name: "סטודיו עם אביזרים",
    kind: "cover",
    component: withFonts(StudioProps),
    fits: "תחומים עם חפצים מזוהים (מסחר, כסף, טכנולוגיה, כלי עבודה), אנרגטי וצבעוני",
  },
  "ad-hook": {
    name: "מודעת הוק",
    kind: "ad",
    component: withFonts(AdHook),
    fits: "פתיחה עם הכאב או שאלה שעוצרת גלילה, והנעה לפעולה",
  },
  "ad-list": {
    name: "מודעת מה בקורס",
    kind: "ad",
    component: withFonts(AdList),
    fits: "רשימת תוצאות או נושאים, מחיר והנעה לפעולה",
  },
} satisfies Record<string, { name: string; kind: TemplateKind; component: React.FC<DesignProps>; fits: string }>;

export type TemplateId = keyof typeof TEMPLATES;
export const TEMPLATE_IDS = Object.keys(TEMPLATES) as TemplateId[];
