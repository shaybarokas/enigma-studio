"use client";

// The mobile menu (☰): a button that opens a panel of links under the header. Used by the marketing
// site and the studio; on wide screens their links sit in the header itself. Closes on a link, on
// Escape and on a tap outside; the page doesn't scroll behind it.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useId, useRef, useState } from "react";

export type NavItem = { href: string; label: string; external?: boolean; icon?: React.ReactNode; ariaLabel?: string };

type MenuProps = { items: NavItem[]; footer?: React.ReactNode; tone?: "light" | "dark"; top?: string };

// The current page is read from the URL, which a prerendered page only knows in the browser: the
// menu renders without the highlight first, then with it.
export function MobileMenu(props: MenuProps) {
  return (
    <Suspense fallback={<Menu {...props} pathname="" />}>
      <MenuHere {...props} />
    </Suspense>
  );
}

function MenuHere(props: MenuProps) {
  return <Menu {...props} pathname={usePathname()} />;
}

function Menu({ items, footer, tone = "light", top = "top-14", pathname }: MenuProps & { pathname: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const dark = tone === "dark";
  return (
    <>
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls={id}
        aria-label={open ? "סגירת התפריט" : "פתיחת התפריט"}
        onClick={() => setOpen((o) => !o)}
        className={`grid size-10 place-items-center rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${dark ? "text-white hover:bg-white/10" : "text-text hover:bg-surface"}`}
      >
        <svg viewBox="0 0 24 24" className="size-6" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
          {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
        </svg>
      </button>
      {open && (
        <div className={`fixed inset-x-0 bottom-0 ${top} z-40 bg-black/40 backdrop-blur-sm`} onClick={() => setOpen(false)}>
          <nav
            id={id}
            aria-label="תפריט"
            className={`border-b shadow-xl ${dark ? "border-white/10 bg-[#0b0b14] text-white" : "border-border bg-bg text-text"}`}
            onClick={(e) => e.stopPropagation()}
          >
            <ul className="mx-auto max-w-7xl px-4 py-3">
              {items.map((it) => {
                const active = !it.external && !it.href.includes("#") && (pathname === it.href || (it.href !== "/studio" && pathname.startsWith(it.href)));
                const cls = `flex items-center gap-3 rounded-2xl px-4 py-3.5 text-base font-bold transition ${active ? "bg-brand/15 text-brand" : dark ? "hover:bg-white/10" : "hover:bg-surface"}`;
                return (
                  <li key={it.href + it.label}>
                    {it.external ? (
                      <a href={it.href} target="_blank" rel="noopener" aria-label={it.ariaLabel} className={cls} onClick={() => setOpen(false)}>
                        {it.icon}
                        {it.label}
                      </a>
                    ) : (
                      <Link href={it.href} aria-current={active ? "page" : undefined} className={cls} onClick={() => setOpen(false)}>
                        {it.icon}
                        {it.label}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
            {footer && <div className={`border-t px-8 py-4 ${dark ? "border-white/10" : "border-border"}`}>{footer}</div>}
          </nav>
        </div>
      )}
    </>
  );
}

type LinkProps = { href: string; children: React.ReactNode; className?: string };

/** A header link that marks itself as the current page. */
export function NavLink(props: LinkProps) {
  return (
    <Suspense fallback={<Plain {...props} pathname="" />}>
      <LinkHere {...props} />
    </Suspense>
  );
}

function LinkHere(props: LinkProps) {
  return <Plain {...props} pathname={usePathname()} />;
}

function Plain({ href, children, className = "", pathname }: LinkProps & { pathname: string }) {
  const active = pathname === href || (href !== "/studio" && pathname.startsWith(href));
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${active ? "bg-brand/10 text-brand" : "text-muted hover:bg-surface hover:text-text"} ${className}`}
    >
      {children}
    </Link>
  );
}
