// The examples on the home page: real output of the studio's engine, made for fictional businesses
// with AI-generated people (no real person appears). Files live in public/showcase.

export type ShowKit = {
  id: string;
  field: string; // what the business does, as a tab label
  business: string; // the fictional business and offer
  brief: string; // what was told to the agent, in one line
  directions: { name: string; file: string }[]; // the three directions, landscape
  chosen: number; // the direction the kit below is built on
  kit: { file: string; label: string; w: number; h: number }[];
  video: string; // story promo, mp4
  poster: string;
};

const sizes = {
  landscape: { w: 16, h: 9, label: "תצוגה ומצגת · 16:9" },
  square: { w: 1, h: 1, label: "פיד · 1:1" },
  portrait: { w: 3, h: 4, label: "פוסט · 3:4" },
  story: { w: 9, h: 16, label: "סטורי · 9:16" },
} as const;
type Size = keyof typeof sizes;

const item = (id: string, name: string, size: Size, label?: string) => ({ file: `/showcase/${id}-${name}-${size}.webp`, label: label ?? sizes[size].label, w: sizes[size].w, h: sizes[size].h });

function kit(id: string, field: string, business: string, brief: string, names: [string, string, string], chosen: number): ShowKit {
  return {
    id,
    field,
    business,
    brief,
    directions: names.map((name, i) => ({ name, file: `/showcase/${id}-c${i}-landscape.webp` })),
    chosen,
    kit: [
      item(id, `c${chosen}`, "landscape", "גרפיקת תצוגה · 16:9"),
      item(id, `c${chosen}`, "square"),
      item(id, `c${chosen}`, "portrait"),
      item(id, `c${chosen}`, "story"),
      item(id, "hook", "square", "מודעת הוק · 1:1"),
      item(id, "list", "story", "מודעת מה בקורס · 9:16"),
    ],
    video: `/showcase/${id}-promo.mp4`,
    poster: `/showcase/${id}-promo.webp`,
  };
}

export const SHOWCASE: ShowKit[] = [
  kit(
    "invest",
    "קורס דיגיטלי",
    "דניאל, יועץ פיננסי: קורס השקעות למתחילים",
    "שכירים עם חסכונות בעו״ש שמפחדים לטעות. טון רציני ויוקרתי, כחול לילה, שחור וזהב.",
    ["משחק ארוך", "נשחק בשקט", "תיק משלכם"],
    0,
  ),
  kit(
    "pilates",
    "סדנת כושר",
    "נועם, מדריכת פילאטיס: סדנה אונליין לגב תחתון",
    "עובדי משרד עם כאבי גב, 15 דקות ביום בסלון. טון אנרגטי ונקי, ירוק מרווה ואפרסק.",
    ["הריסט של הבוקר", "הכיסא נגד הגב", "בוקר שקט, גב חזק"],
    1,
  ),
  kit(
    "baker",
    "סדנת אפייה",
    "מיכל, אופה: סדנת מחמצת ביתית",
    "אוהבי אפייה שהלחם שלהם יוצא שטוח וחמוץ. טון חם וביתי עם הומור, חום קלוי וטרקוטה.",
    ["מאפייה בשעת בוקר", "זה לא את", "מחמצת עם חיוך"],
    2,
  ),
];
