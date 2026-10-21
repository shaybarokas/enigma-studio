"use client";

import { DesignThumb } from "@/components/design-preview-lazy";
import type { TemplateId } from "@/engine/templates";
import type { Kit } from "@/lib/kits";

// The kit's card image: its chosen design, else its first concept, else a branded placeholder.
export function KitCover({ kit }: { kit: Pick<Kit, "design" | "concepts" | "chosen"> }) {
  const c = kit.concepts?.[kit.chosen ?? 0];
  const design = kit.design ?? c?.design;
  if (!design || !c) {
    return (
      <div className="flex aspect-video items-center justify-center bg-gradient-to-br from-brand-strong via-brand to-neon text-4xl text-white/80">
        ✦
      </div>
    );
  }
  return <DesignThumb design={design} template={c.concept.templateId as TemplateId} format="landscape" />;
}
