"use client";

import { useRef, useState } from "react";
import { TUTORIAL } from "@/lib/tutorial";

// YouTube loads only after a click (a poster until then), so pages stay fast and nothing is sent
// to YouTube before the visitor asks for it (and then through youtube-nocookie). Computers get the
// 16:9 walkthrough; phones get the vertical one that shows the phone interface.
function Player({ id, vertical, title }: { id: string; vertical: boolean; title: string }) {
  const [playing, setPlaying] = useState(false);
  return (
    <div className={`relative overflow-hidden rounded-3xl border border-border bg-black shadow-2xl shadow-brand/15 ${vertical ? "mx-auto aspect-[9/16] w-full max-w-[340px]" : "aspect-video w-full"}`}>
      {playing ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
          title={title}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          className="absolute inset-0 h-full w-full"
        />
      ) : (
        <button type="button" onClick={() => setPlaying(true)} className="group absolute inset-0 h-full w-full" aria-label={`ניגון: ${title}`}>
          {/* eslint-disable-next-line @next/next/no-img-element -- YouTube's own poster */}
          <img src={`https://i.ytimg.com/vi/${id}/${vertical ? "oar2" : "maxresdefault"}.jpg`} alt="" className="h-full w-full object-cover opacity-85 transition group-hover:opacity-100" loading="lazy" />
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex size-20 items-center justify-center rounded-full bg-brand text-white shadow-xl shadow-brand/40 transition group-hover:scale-110">
              <svg viewBox="0 0 24 24" className="ms-1 size-9" fill="currentColor" aria-hidden="true">
                <path d="M8 5v14l11-7z" />
              </svg>
            </span>
          </span>
          <span className="absolute bottom-3 right-3 rounded-full bg-black/70 px-3 py-1 text-xs font-bold text-white">{TUTORIAL.length}</span>
        </button>
      )}
    </div>
  );
}

export function TutorialVideo({ title = "סרטון הדרכה: Enigma Studio" }: { title?: string }) {
  return (
    <>
      <div className="hidden md:block">
        <Player id={TUTORIAL.desktop} vertical={false} title={title} />
      </div>
      <div className="md:hidden">
        <Player id={TUTORIAL.phone} vertical title={title} />
      </div>
    </>
  );
}

/** A button that opens the tutorial in a dialog (the studio). */
export function TutorialButton({ className, children }: { className?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const close = () => {
    ref.current?.close();
    setOpen(false);
  };
  return (
    <>
      <button
        type="button"
        className={className}
        onClick={() => {
          setOpen(true);
          ref.current?.showModal();
        }}
      >
        {children}
      </button>
      <dialog
        ref={ref}
        dir="rtl"
        aria-label="סרטון הדרכה"
        onClose={() => setOpen(false)}
        onClick={(e) => e.target === e.currentTarget && close()}
        className="m-auto w-[min(94vw,56rem)] rounded-3xl border border-border bg-surface p-0 text-text shadow-2xl backdrop:bg-black/70"
      >
        <div className="flex items-center justify-between px-5 pt-4">
          <h2 className="font-extrabold">סרטון הדרכה: כל הסטודיו ב־{TUTORIAL.length}</h2>
          <button type="button" onClick={close} aria-label="סגירה" className="rounded-full p-2 text-muted hover:text-text">
            ✕
          </button>
        </div>
        {/* Mounted only while open, so closing stops the video. */}
        <div className="p-4">{open && <TutorialVideo />}</div>
      </dialog>
    </>
  );
}
