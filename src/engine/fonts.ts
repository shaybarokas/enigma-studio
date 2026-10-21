// Google fonts the engine can use. Hebrew faces for copy, display faces for brand wordmarks.
import { useEffect, useState } from "react";
import { continueRender, delayRender } from "remotion";
import type { FontName } from "./fonts-list";
import { loadFont as heebo } from "@remotion/google-fonts/Heebo";
import { loadFont as rubik } from "@remotion/google-fonts/Rubik";
import { loadFont as secularOne } from "@remotion/google-fonts/SecularOne";
import { loadFont as suezOne } from "@remotion/google-fonts/SuezOne";
import { loadFont as frankRuhl } from "@remotion/google-fonts/FrankRuhlLibre";
import { loadFont as playfair } from "@remotion/google-fonts/PlayfairDisplay";
import { loadFont as bebas } from "@remotion/google-fonts/BebasNeue";
import { loadFont as anton } from "@remotion/google-fonts/Anton";

const loaders: Record<FontName, () => { fontFamily: string; waitUntilDone: () => Promise<unknown> }> = {
  Heebo: () => heebo("normal", { weights: ["400", "500", "700", "800", "900"], subsets: ["hebrew", "latin"] }),
  Rubik: () => rubik("normal", { weights: ["400", "700", "900"], subsets: ["hebrew", "latin"] }),
  "Secular One": () => secularOne("normal", { subsets: ["hebrew", "latin"] }),
  "Suez One": () => suezOne("normal", { subsets: ["hebrew", "latin"] }),
  "Frank Ruhl Libre": () => frankRuhl("normal", { weights: ["400", "700", "900"], subsets: ["hebrew", "latin"] }),
  "Playfair Display": () => playfair("normal", { weights: ["700", "900"], subsets: ["latin"] }),
  "Bebas Neue": () => bebas("normal", { subsets: ["latin"] }),
  Anton: () => anton("normal", { subsets: ["latin"] }),
};

export { FONT_NAMES, type FontName } from "./fonts-list";

const loaded = new Map<FontName, { family: string; done: Promise<unknown> }>();

function load(name: FontName) {
  let f = loaded.get(name);
  if (!f) {
    const r = loaders[name]();
    f = { family: r.fontFamily, done: r.waitUntilDone() };
    loaded.set(name, f);
  }
  return f;
}

/** Loads a font once and returns its CSS font-family. */
export function fontFamily(name: FontName): string {
  return load(name).family;
}

/**
 * True once the given fonts have loaded. Text is measured to fit its box (fitText), and a measurement
 * taken with a fallback font is wrong, so templates draw nothing until this is true. Stills and video
 * frames wait for it too (delayRender).
 */
export function useFontsReady(names: FontName[]): boolean {
  const key = names.join("|");
  const [ready, setReady] = useState<string | null>(null);
  useEffect(() => {
    const handle = delayRender(`fonts ${key}`);
    let live = true;
    Promise.all(key.split("|").map((n) => load(n as FontName).done))
      .then(() => {
        if (live) setReady(key);
      })
      .finally(() => continueRender(handle));
    return () => {
      live = false;
    };
  }, [key]);
  return ready === key;
}
