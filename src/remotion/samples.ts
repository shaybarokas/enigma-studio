// Sample kits used to develop and test templates. Assets live in public/dev (not committed).
import { staticFile } from "remotion";
import type { DesignProps } from "../engine/design";
import type { VideoProps } from "../engine/video/schema";

export const brickBoss: DesignProps = {
  brand: {
    palette: { bg: "#050d13", ink: "#eef3f6", muted: "#93a7b4", accent: "#f2b54a" },
    displayFont: "Playfair Display",
    headlineFont: "Heebo",
    bodyFont: "Heebo",
  },
  copy: {
    wordmark: ["BRICK", "BOSS"],
    kicker: "ללוות ולהרוויח",
    headline: "רוצה להרוויח מנדל״ן|בלי לקנות דירה?",
    subtitle: "קריירה בתור מלווה משקיעי נדל״ן",
    bullets: [
      "איך מוצאים עסקאות שאחרים מפספסים",
      "בדיקת נאותות מלאה, צעד אחר צעד",
      "בניית תיק לקוחות משקיעים",
      "מודל תמחור שמכניס כל חודש",
    ],
    icons: ["search", "trust", "people", "cash"],
    tags: [],
    cta: "להצטרפות לקורס",
    price: "₪649",
  },
  assets: {
    background: staticFile("dev/brick-bg-16x9.jpg"),
    backgroundTall: staticFile("dev/brick-bg-9x16.jpg"),
    subject: { src: staticFile("dev/brick-subject.png"), aspect: 613 / 986 },
    props: [],
  },
  subjectSide: "left",
  overrides: {},
};

export const swingWin: DesignProps = {
  brand: {
    palette: { bg: "#3f8f45", ink: "#fbfff7", muted: "#d8efd5", accent: "#ffd23f" },
    displayFont: "Anton",
    headlineFont: "Heebo",
    bodyFont: "Heebo",
  },
  copy: {
    wordmark: ["SWING &", "WIN"],
    kicker: "קורס מסחר בסווינג",
    headline: "המניה עלתה|ואתה שוב פספסת?",
    subtitle: "קורס מסחר בסווינג במט״ח ובמניות",
    bullets: ["לזהות מגמה לפני כולם", "ניהול סיכונים בלי פחד", "אסטרטגיה ל־15 דקות ביום"],
    icons: ["growth", "protect", "time"],
    tags: ["שוק ההון", "מט״ח"],
    cta: "אני רוצה להתחיל",
    price: "₪399",
  },
  assets: {
    background: staticFile("dev/brick-bg-16x9.jpg"),
    subject: { src: staticFile("dev/swing-subject.png"), aspect: 473 / 1019 },
    props: [
      { src: staticFile("dev/prop-coin.png"), aspect: 1401 / 1413 },
      { src: staticFile("dev/prop-candles.png"), aspect: 1846 / 1869 },
      { src: staticFile("dev/prop-bitcoin.png"), aspect: 1305 / 1386 },
    ],
  },
  subjectSide: "right",
  overrides: {},
};

// Fake word timings (no audio) to develop the video scenes and captions.
const timed = (line: string, from = 0.3) =>
  line.split(" ").map((text, i) => ({ text, start: from + i * 0.32, end: from + i * 0.32 + 0.28 }));

export const sampleVideo: VideoProps = {
  kind: "promo",
  design: brickBoss,
  cover: "cinematic-poster",
  captions: "bold",
  scenes: [
    { role: "hook", visual: "scene", title: "הכסף נמצא בעסקה", sub: "", items: [], voice: "", lead: 8, emphasis: ["משקיעים"], words: timed("הכירו את בריק בוס, הדרך שלך ללוות משקיעים"), durationInFrames: 110, cuts: [55], transition: "flash" },
    { role: "intro", visual: "cover", title: "BRICK BOSS", sub: "", items: [], voice: "", lead: 4, emphasis: [], words: [], durationInFrames: 90, cuts: [], transition: "zoom" },
    { role: "lecturer", visual: "lecturer", title: "עשרים שנה בשוק", sub: "מלווה משקיעים", items: [], voice: "", lead: 4, emphasis: ["עשרים"], words: timed("עשרים שנה בשוק הנדל״ן, עכשיו זה התור שלך"), durationInFrames: 120, cuts: [60], transition: "cut" },
    { role: "outcomes", visual: "list", title: "מה תלמדו", sub: "", items: brickBoss.copy.bullets, voice: "", lead: 4, emphasis: [], words: [], durationInFrames: 120, cuts: [], transition: "fade" },
    { role: "cta", visual: "logo", title: "מקומות אחרונים", sub: "", items: [], voice: "", lead: 4, emphasis: [], words: [], durationInFrames: 110, cuts: [], transition: "cut" },
  ],
};
