import { CATALOG, type TemplateId } from "../catalog";
import type { DesignProps } from "../design";
import { withFonts } from "../with-fonts";
import { AdHook } from "./ad-hook";
import { AdList } from "./ad-list";
import { ArchLuxe } from "./arch-luxe";
import { BoldRepeat } from "./bold-repeat";
import { CinematicPoster } from "./cinematic-poster";
import { HeadlineImpact } from "./headline-impact";
import { SplitEditorial } from "./split-editorial";
import { StudioProps } from "./studio-props";

export { TEMPLATE_IDS, type TemplateId } from "../catalog";

const components: Record<TemplateId, React.FC<DesignProps>> = {
  "cinematic-poster": CinematicPoster,
  "headline-impact": HeadlineImpact,
  "studio-props": StudioProps,
  "arch-luxe": ArchLuxe,
  "split-editorial": SplitEditorial,
  "bold-repeat": BoldRepeat,
  "ad-hook": AdHook,
  "ad-list": AdList,
};

/** Every template, ready to render: metadata from the catalog plus its font-aware component. */
export const TEMPLATES = Object.fromEntries(
  (Object.keys(components) as TemplateId[]).map((id) => [id, { ...CATALOG[id], component: withFonts(components[id]) }]),
) as Record<TemplateId, (typeof CATALOG)[TemplateId] & { component: React.FC<DesignProps> }>;
