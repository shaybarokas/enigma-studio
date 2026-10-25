"use client";

import Script from "next/script";
import { useEffect } from "react";

// The Meta (Facebook) pixel, for retargeting and for optimizing campaigns on signups and payments.
// Without NEXT_PUBLIC_META_PIXEL_ID (local dev, previews) nothing loads and every call is a no-op.
const ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

type Fbq = ((...args: unknown[]) => void) & { callMethod?: (...args: unknown[]) => void; queue: unknown[]; push: Fbq; loaded: boolean; version: string };

// Meta's own queueing stub, so calls made before fbevents.js arrives are sent once it does.
function fbq(...args: unknown[]) {
  if (!ID || typeof window === "undefined") return;
  const w = window as unknown as { fbq?: Fbq; _fbq?: Fbq };
  if (!w.fbq) {
    const f = function (...a: unknown[]) {
      if (f.callMethod) f.callMethod(...a);
      else f.queue.push(a);
    } as Fbq;
    f.push = f;
    f.loaded = true;
    f.version = "2.0";
    f.queue = [];
    w.fbq = f;
    if (!w._fbq) w._fbq = f;
    f("init", ID);
  }
  w.fbq(...args);
}

/** A standard event. `eventID` lets Meta drop a repeat (and later match a server-side copy). */
export function track(event: string, params?: Record<string, unknown>, eventID?: string) {
  if (eventID) fbq("track", event, params ?? {}, { eventID });
  else fbq("track", event, params ?? {});
}

/** The pixel itself (root layout): loads the script and sends the first PageView. Moves between pages
 * after that are reported by fbevents.js itself (it follows history.pushState). */
export function MetaPixel() {
  useEffect(() => {
    track("PageView");
  }, []);
  if (!ID) return null;
  return (
    <>
      <Script id="meta-pixel" src="https://connect.facebook.net/en_US/fbevents.js" strategy="afterInteractive" />
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img height="1" width="1" style={{ display: "none" }} alt="" src={`https://www.facebook.com/tr?id=${ID}&ev=PageView&noscript=1`} />
      </noscript>
    </>
  );
}

/** Sends one event when a page that the server confirmed it for opens (a new account, a payment),
 * once per browser tab, and takes the marker param out of the address so a refresh doesn't repeat it. */
export function TrackOnce({ events, eventID, strip }: { events: { name: string; params?: Record<string, unknown> }[]; eventID: string; strip: string }) {
  useEffect(() => {
    const key = `fb:${eventID}`;
    let seen = false;
    try {
      seen = sessionStorage.getItem(key) === "1";
      sessionStorage.setItem(key, "1");
    } catch {}
    if (!seen) for (const e of events) track(e.name, e.params, `${e.name}-${eventID}`);
    const url = new URL(window.location.href);
    if (url.searchParams.has(strip)) {
      url.searchParams.delete(strip);
      window.history.replaceState(window.history.state, "", url);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventID]);
  return null;
}
