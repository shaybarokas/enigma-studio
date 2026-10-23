import type { DesignProps } from "@/engine/design";
import type { Concept } from "./concepts";

type Image = { src: string; aspect: number };

/** A concept plus its generated assets → the props every template renders. */
export function conceptToDesign(
  c: Concept,
  assets: { background: string; backgroundTall?: string; subject?: Image; props: Image[] },
  extra: { price?: string | null; lecturer?: string | null } = {},
): DesignProps {
  return {
    brand: {
      palette: c.palette,
      displayFont: c.displayFont,
      headlineFont: c.headlineFont,
      bodyFont: c.bodyFont,
    },
    copy: {
      wordmark: c.wordmark.slice(0, 3),
      kicker: c.kicker,
      headline: c.headline,
      subtitle: c.subtitle,
      bullets: c.bullets.slice(0, 6),
      icons: c.icons.slice(0, 6),
      tags: c.tags.slice(0, 3),
      cta: c.cta,
      price: extra.price ?? undefined,
      lecturer: extra.lecturer ?? undefined,
    },
    assets: { background: assets.background, backgroundTall: assets.backgroundTall, subject: assets.subject, props: assets.props },
    subjectSide: c.subjectSide,
    overrides: {},
  };
}
