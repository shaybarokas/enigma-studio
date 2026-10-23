// WhatsApp with Lior, ENIGMA's sales and support rep. A plain link (wa.me) with an inline icon: no
// external script. Each place passes its own opening message; every one says the person came from the
// Enigma Studio site, so Lior knows where they came from. Never used in outputs (designs, videos) or emails.

export const LIOR = { name: "ליאור", phone: "972553089771", display: "055-308-9771" } as const;

const FROM = "הגעתי מהאתר של אניגמה סטודיו";
/** The opening messages, by where the link is. */
export const WA_TEXT = {
  site: `היי ליאור, ${FROM} ויש לי שאלה`,
  pricing: `היי ליאור, ${FROM} ואשמח לעזרה בבחירת מסלול`,
  studio: `היי ליאור, ${FROM} ואני צריך עזרה`,
  billing: `היי ליאור, ${FROM} ויש לי שאלה על המנוי והקרדיטים`,
} as const;

export const waHref = (text: string) => `https://wa.me/${LIOR.phone}?text=${encodeURIComponent(text)}`;

const LABEL = "שיחה בוואטסאפ עם ליאור, נפתח בחלון חדש";

export const WhatsAppIcon: React.FC<{ className?: string }> = ({ className = "size-5" }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className={className} fill="currentColor">
    <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.87 9.87 0 0 0 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 18.15h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.23 8.25-8.23 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.82c0 4.54-3.7 8.23-8.23 8.23Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.24-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.5.11-.11.25-.29.37-.44.12-.14.16-.25.25-.41.08-.17.04-.31-.02-.43-.06-.13-.56-1.35-.76-1.84-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.22.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.14-1.18-.06-.1-.22-.16-.47-.28Z" />
  </svg>
);

/** A link to WhatsApp with Lior (new tab), styled per place. */
export function WhatsAppLink({ text, className, children }: { text: string; className?: string; children?: React.ReactNode }) {
  return (
    <a href={waHref(text)} target="_blank" rel="noopener" aria-label={LABEL} className={className}>
      {children}
    </a>
  );
}

/**
 * The marketing site's floating button: a small pill in the bottom corner (icon only on phones, so it
 * never covers the page's own buttons), above the iPhone's home bar.
 */
export function WhatsAppFloat() {
  return (
    <WhatsAppLink
      text={WA_TEXT.site}
      className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] end-4 z-30 inline-flex items-center gap-2 rounded-full bg-[#7c3aed] p-3 text-sm font-bold text-white shadow-lg shadow-black/30 ring-1 ring-white/20 transition hover:bg-[#6d28d9] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#a78bfa] sm:px-4 sm:py-2.5"
    >
      <WhatsAppIcon className="size-6 sm:size-5" />
      <span className="hidden sm:inline">יש שאלה? דברו עם ליאור</span>
    </WhatsAppLink>
  );
}
