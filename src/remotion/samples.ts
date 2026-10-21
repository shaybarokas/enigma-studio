// Sample kits used to develop and test templates. Assets live in public/dev (not committed).
import { staticFile } from "remotion";
import type { DesignProps } from "../engine/design";

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
