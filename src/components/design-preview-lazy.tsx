"use client";

// The previews load in the browser only: Remotion reads the clock when its modules load, which the
// server's prerender refuses (and a server-rendered canvas would be thrown away anyway). Each
// preview holds its final shape while it loads, so the page doesn't jump.
import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import { FORMATS } from "@/engine/formats";
import type * as Preview from "./design-preview";

const placeholder = () => <div className="h-full w-full animate-pulse bg-surface" />;

const Thumb = dynamic(() => import("./design-preview").then((m) => m.DesignThumb), { ssr: false, loading: placeholder });
const Play = dynamic(() => import("./design-preview").then((m) => m.DesignPlayer), { ssr: false, loading: placeholder });

export function DesignThumb(props: ComponentProps<typeof Preview.DesignThumb>) {
  const f = FORMATS[props.format];
  return (
    <div style={{ aspectRatio: `${f.width} / ${f.height}` }} className={props.className}>
      <Thumb {...props} className={undefined} />
    </div>
  );
}

export function DesignPlayer(props: ComponentProps<typeof Preview.DesignPlayer>) {
  const f = FORMATS[props.format];
  return (
    <div style={{ aspectRatio: `${f.width} / ${f.height}` }}>
      <Play {...props} />
    </div>
  );
}
