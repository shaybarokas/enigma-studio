"use client";

import { useRef, useState } from "react";
import type { ShowKit } from "./showcase";

// Real kits from the engine, one tab per business: the brief, the three directions, the kit.
export function Examples({ kits }: { kits: ShowKit[] }) {
  const [active, setActive] = useState(0);
  const k = kits[active];
  if (!k) return null;
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap justify-center gap-2" role="tablist" aria-label="דוגמאות לפי תחום">
        {kits.map((x, i) => (
          <button
            key={x.id}
            role="tab"
            id={`tab-${x.id}`}
            aria-selected={i === active}
            aria-controls={`panel-${x.id}`}
            onClick={() => setActive(i)}
            className={`rounded-full border px-5 py-2.5 text-sm font-bold transition ${i === active ? "border-brand bg-brand text-white shadow-lg shadow-brand/30" : "border-border bg-surface text-muted hover:border-brand hover:text-text"}`}
          >
            {x.field}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`panel-${k.id}`} aria-labelledby={`tab-${k.id}`} className="space-y-8">
        <div className="mx-auto max-w-3xl rounded-2xl border border-dashed border-border bg-surface/60 p-4 text-center text-sm">
          <span className="font-bold">{k.business}. </span>
          <span className="text-muted">מה סופר לסוכן: &quot;{k.brief}&quot;</span>
        </div>

        <div>
          <p className="mb-3 text-center text-sm font-bold text-muted">שלושה כיוונים שהסוכן הציע</p>
          <ul className="grid gap-3 sm:grid-cols-3">
            {k.directions.map((d, i) => (
              <li key={d.file} className={`overflow-hidden rounded-2xl border ${i === k.chosen ? "border-brand ring-2 ring-brand/40" : "border-border"}`}>
                {/* eslint-disable-next-line @next/next/no-img-element -- static showcase files, already sized */}
                <img src={d.file} alt={`כיוון ${i + 1}: ${d.name}`} loading="lazy" className="aspect-video w-full object-cover" />
                <p className="flex items-center justify-between gap-2 bg-surface px-3 py-2 text-xs font-semibold">
                  <span>{d.name}</span>
                  {i === k.chosen && <span className="rounded-full bg-brand px-2 py-0.5 text-white">נבחר</span>}
                </p>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="mb-3 text-center text-sm font-bold text-muted">הערכה שנבנתה מהכיוון שנבחר, בכל הגדלים</p>
          <ul className="grid grid-cols-2 items-end gap-3 md:grid-cols-[2.4fr_1.2fr_1fr_0.7fr]">
            {k.kit.slice(0, 4).map((x, i) => (
              <Figure key={x.file} x={x} wide={i === 0} />
            ))}
          </ul>
          <ul className="mt-3 grid grid-cols-2 items-end gap-3 md:mx-auto md:max-w-xl md:grid-cols-[1.4fr_0.8fr]">
            {k.kit.slice(4).map((x) => (
              <Figure key={x.file} x={x} />
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function Figure({ x, wide = false }: { x: ShowKit["kit"][number]; wide?: boolean }) {
  return (
    <li className={wide ? "col-span-2 md:col-span-1" : ""}>
      {/* eslint-disable-next-line @next/next/no-img-element -- static showcase files, already sized */}
      <img src={x.file} alt={x.label} loading="lazy" style={{ aspectRatio: `${x.w} / ${x.h}` }} className="w-full rounded-2xl border border-border object-cover shadow-lg" />
      <p className="mt-1.5 text-center text-xs font-semibold text-muted">{x.label}</p>
    </li>
  );
}

/** A story video in a phone frame: muted autoplay, with a sound toggle. */
export function PhoneVideo({ src, poster, label }: { src: string; poster: string; label: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  return (
    <figure className="flex flex-col items-center gap-3">
      <div className="relative w-full max-w-[260px] rounded-[2.2rem] border-[6px] border-[#1c1c2b] bg-black p-1 shadow-2xl shadow-black/50">
        <video ref={ref} src={src} poster={poster} autoPlay muted={muted} loop playsInline preload="metadata" aria-label={label} className="aspect-[9/16] w-full rounded-[1.7rem] object-cover" />
        <button
          onClick={() => {
            const v = ref.current;
            if (!v) return;
            v.muted = !muted;
            if (muted) {
              v.currentTime = 0;
              v.play();
            }
            setMuted(!muted);
          }}
          className="absolute bottom-4 start-1/2 -translate-x-1/2 rounded-full bg-black/60 px-4 py-2 text-xs font-bold text-white backdrop-blur hover:bg-black/80 rtl:translate-x-1/2"
        >
          {muted ? "🔊 עם סאונד" : "🔇 השתקה"}
        </button>
      </div>
      <figcaption className="text-sm font-semibold text-muted">{label}</figcaption>
    </figure>
  );
}
