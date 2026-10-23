import { fitText } from "@remotion/layout-utils";

/** The largest font size at which every line fits the width. Measures each line as it will be drawn
 * (uppercase, letter spacing): the line with the most characters is not always the widest. */
export function fitLines(lines: string[], withinWidth: number, fontFamily: string, opts: { letterSpacing?: string; uppercase?: boolean } = {}) {
  const sizes = lines
    .filter(Boolean)
    .map(
      (text) =>
        fitText({ text, withinWidth, fontFamily, fontWeight: 900, letterSpacing: opts.letterSpacing, textTransform: opts.uppercase ? "uppercase" : undefined }).fontSize,
    );
  return sizes.length ? Math.min(...sizes) : Infinity;
}

/** Text broken into at most two lines of balanced length (at a space). */
export function balancedLines(text: string): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length <= 2 || text.length <= 12) return [words.join(" ")];
  let best = 1;
  let diff = Infinity;
  for (let i = 1; i < words.length; i++) {
    const d = Math.abs(words.slice(0, i).join(" ").length - words.slice(i).join(" ").length);
    if (d < diff) [best, diff] = [i, d];
  }
  return [words.slice(0, best).join(" "), words.slice(best).join(" ")];
}
