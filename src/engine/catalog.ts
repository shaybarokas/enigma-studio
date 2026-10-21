// Template metadata without the components, so server code (the agent) can read it cheaply.
export const CATALOG = {
  "cinematic-poster": {
    name: "פוסטר קולנועי",
    kind: "cover",
    fits: "Strong brand name, lecturer in an authority pose, serious or premium fields (real estate, finance, business, law). Moody photographic scene, metallic wordmark.",
  },
  "headline-impact": {
    name: "כותרת ענק",
    kind: "cover",
    fits: "A punchy Hebrew line that stops the scroll (a bold claim or question); emotional or dramatic fields (psychology, body language, therapy, relationships). Deep single-colour world, giant ghost of the lecturer.",
  },
  "studio-props": {
    name: "סטודיו עם אביזרים",
    kind: "cover",
    fits: "Fields with iconic objects (trading, money, tech, tools, beauty, food). Bright, saturated studio colour with 3D props floating around the lecturer. Energetic.",
  },
  "ad-hook": { name: "מודעת הוק", kind: "ad", fits: "Opens with the pain or a scroll-stopping question, then one call to action." },
  "ad-list": { name: "מודעת מה בקורס", kind: "ad", fits: "Outcomes or topics as a list, price and call to action." },
} as const;

export type TemplateId = keyof typeof CATALOG;
export const TEMPLATE_IDS = Object.keys(CATALOG) as TemplateId[];
export const COVER_TEMPLATE_IDS = TEMPLATE_IDS.filter((t) => CATALOG[t].kind === "cover");
