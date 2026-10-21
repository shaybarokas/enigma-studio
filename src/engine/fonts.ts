// Google fonts the engine can use. Hebrew faces for copy, display faces for brand wordmarks.
import { loadFont as heebo } from "@remotion/google-fonts/Heebo";
import { loadFont as rubik } from "@remotion/google-fonts/Rubik";
import { loadFont as secularOne } from "@remotion/google-fonts/SecularOne";
import { loadFont as suezOne } from "@remotion/google-fonts/SuezOne";
import { loadFont as frankRuhl } from "@remotion/google-fonts/FrankRuhlLibre";
import { loadFont as playfair } from "@remotion/google-fonts/PlayfairDisplay";
import { loadFont as bebas } from "@remotion/google-fonts/BebasNeue";
import { loadFont as anton } from "@remotion/google-fonts/Anton";

const loaders = {
  Heebo: () => heebo("normal", { weights: ["400", "500", "700", "800", "900"], subsets: ["hebrew", "latin"] }),
  Rubik: () => rubik("normal", { weights: ["400", "700", "900"], subsets: ["hebrew", "latin"] }),
  "Secular One": () => secularOne("normal", { subsets: ["hebrew", "latin"] }),
  "Suez One": () => suezOne("normal", { subsets: ["hebrew", "latin"] }),
  "Frank Ruhl Libre": () => frankRuhl("normal", { weights: ["400", "700", "900"], subsets: ["hebrew", "latin"] }),
  "Playfair Display": () => playfair("normal", { weights: ["700", "900"], subsets: ["latin"] }),
  "Bebas Neue": () => bebas("normal", { subsets: ["latin"] }),
  Anton: () => anton("normal", { subsets: ["latin"] }),
} as const;

export type FontName = keyof typeof loaders;
export const FONT_NAMES = Object.keys(loaders) as FontName[];

const loaded = new Map<FontName, string>();

/** Loads a font once and returns its CSS font-family. */
export function fontFamily(name: FontName): string {
  let family = loaded.get(name);
  if (!family) {
    family = loaders[name]().fontFamily;
    loaded.set(name, family);
  }
  return family;
}
