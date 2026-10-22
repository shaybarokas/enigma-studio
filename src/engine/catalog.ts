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
  "arch-luxe": {
    name: "קשת יוקרתית",
    kind: "cover",
    fits: "Calm, premium, soft: wellness, beauty, coaching, therapy, yoga, food, art, lifestyle. The lecturer framed in an arched window onto their world, a solid ground, fine spaced typography. Light or deep palette; elegant serif (Playfair Display) or refined display wordmark.",
  },
  "split-editorial": {
    name: "מגזין מפוצל",
    kind: "cover",
    fits: "Confident, modern, clean: business, consulting, marketing, sales, tech, education, careers. A magazine cover cut in two: the lecturer in their world on one panel, a solid brand panel with a masthead and a big Hebrew headline on the other. Needs a strong headline.",
  },
  "bold-repeat": {
    name: "טיפוגרפיה מתרסקת",
    kind: "cover",
    fits: "Loud, young, pop: creators, social media, fitness, music, sales, events, gaming. The brand name repeated in huge condensed rows across a saturated colour, the lecturer big in front, a tilted sticker with the promise. Needs a short punchy wordmark (Anton or Bebas Neue) and a vivid bg.",
  },
  "ad-hook": { name: "מודעת הוק", kind: "ad", fits: "Opens with the pain or a scroll-stopping question, then one call to action." },
  "ad-list": { name: "מודעת מה בקורס", kind: "ad", fits: "Outcomes or topics as a list, price and call to action." },
} as const;

export type TemplateId = keyof typeof CATALOG;
export const TEMPLATE_IDS = Object.keys(CATALOG) as TemplateId[];
export const COVER_TEMPLATE_IDS = TEMPLATE_IDS.filter((t) => CATALOG[t].kind === "cover");
