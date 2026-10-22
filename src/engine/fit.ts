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
