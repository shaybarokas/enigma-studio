// Font names only (no loaders), so server code can validate choices without loading Remotion.
export const FONT_NAMES = [
  "Heebo",
  "Rubik",
  "Secular One",
  "Suez One",
  "Frank Ruhl Libre",
  "Playfair Display",
  "Bebas Neue",
  "Anton",
] as const;
export type FontName = (typeof FONT_NAMES)[number];
