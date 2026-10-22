import type { DesignProps } from "./design";
import { useFontsReady, type FontName } from "./fonts";
import { Watermark } from "./watermark";

/** Renders a template only once its brand fonts are loaded, so every text measurement is exact. */
export function withFonts(Template: React.FC<DesignProps>): React.FC<DesignProps> {
  const WithFonts: React.FC<DesignProps> = (p) => {
    const ready = useFontsReady([p.brand.displayFont, p.brand.headlineFont, p.brand.bodyFont] as FontName[]);
    if (!ready) return null;
    return (
      <>
        <Template {...p} />
        {p.watermark && <Watermark />}
      </>
    );
  };
  WithFonts.displayName = `WithFonts(${Template.displayName ?? Template.name})`;
  return WithFonts;
}
