// Puts a kit's media to work: the latest lecturer and logo go into every concept and the chosen
// design, products lead the props, and the brand colours land in the brief.
import type { DesignProps } from "@/engine/design";
import type { KitConcept } from "../kits";
import type { Brief } from "./brief";
import { brandColors, type Media } from "./media";

/** The image used for a role: the one marked primary, else the latest. */
export function latest(media: Media[], role: Media["role"]) {
  const ready = media.filter((m) => m.role === role && m.cut);
  return ready.find((m) => m.primary) ?? ready.at(-1);
}

/** Marks one image as the primary of its role (and no other of that role). */
export function makePrimary(media: Media[], id: string): Media[] {
  const role = media.find((m) => m.id === id)?.role;
  return media.map((m) => (m.role === role ? { ...m, primary: m.id === id } : m));
}

/** Products the user gave, ready to stand in for AI props. */
export const productProps = (media: Media[]) => media.filter((m) => m.role === "product" && m.cut).map((m) => m.cut!);

function withMedia(design: DesignProps, media: Media[], aiProps: DesignProps["assets"]["props"]): DesignProps {
  const lecturer = latest(media, "lecturer");
  const logo = latest(media, "logo");
  // A second logo in the other tone (white beside black) serves the grounds the first can't.
  const alt = media.filter((m) => m.role === "logo" && m.cut && m.id !== logo?.id && m.tone && m.tone !== logo?.tone).at(-1);
  return {
    ...design,
    assets: {
      ...design.assets,
      subject: lecturer?.cut ?? design.assets.subject,
      logo: logo?.cut ? { ...logo.cut, tone: logo.tone, alt: alt?.cut ? { ...alt.cut, tone: alt.tone } : undefined } : undefined,
      props: [...productProps(media), ...aiProps].slice(0, 6),
    },
  };
}

/** The kit fields to save after its media changed. AI props are kept; the user's products go first.
 * `before` is the media as it was, so a product that was removed or re-labelled leaves the props too. */
export function applyMedia(kit: { media: Media[]; concepts: KitConcept[] | null; design: DesignProps | null; brief: Brief | null; subject: unknown }, before: Media[] = []) {
  const own = new Set([...before, ...kit.media].filter((m) => m.cut).map((m) => m.cut!.src));
  const aiOnly = (d: DesignProps) => d.assets.props.filter((p) => !own.has(p.src));
  const lecturer = latest(kit.media, "lecturer");
  const colors = brandColors(kit.media);
  return {
    media: kit.media,
    subject: lecturer?.cut ?? kit.subject ?? null,
    concepts: kit.concepts?.map((c) => ({ ...c, design: withMedia(c.design, kit.media, aiOnly(c.design)) })) ?? null,
    design: kit.design ? withMedia(kit.design, kit.media, aiOnly(kit.design)) : null,
    brief: kit.brief && colors.length ? { ...kit.brief, brandColors: [...new Set([...colors, ...(kit.brief.brandColors ?? [])])].slice(0, 6) } : kit.brief,
  };
}
