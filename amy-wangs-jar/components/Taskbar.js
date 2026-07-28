"use client";

import Link from "next/link";
import Image from "next/image";

import { useLayoutEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";

const NAV_LINKS = [
  { label: "Portfolio", href: "https://amywang.framer.website", external: true },
  { label: "Etc", href: "/etc" },
  { label: "Notes", href: "/notes" },
];

function Logo({ linkClassName, onClick }) {
  return (
    <Link href="/" onClick={onClick} className={linkClassName}>
      <Image
        src="/images/logos/logo.png"
        alt="Amy Wang's Jar logo"
        width={44}
        height={44}
        priority
        className="h-11 w-11 object-contain"
      />
    </Link>
  );
}

function NavLinks({ linkClassName, onLinkClick }) {
  return NAV_LINKS.map((link) =>
    link.external ? (
      <a
        key={link.label}
        href={link.href}
        target="_blank"
        rel="noopener noreferrer"
        className={linkClassName}
        onClick={onLinkClick}
      >
        {link.label}
      </a>
    ) : (
      <Link key={link.label} href={link.href} className={linkClassName} onClick={onLinkClick}>
        {link.label}
      </Link>
    )
  );
}

export default function Taskbar() {
  const [open, setOpen] = useState(false);
  const headerRef = useRef(null);

  // Jar's hero section sizes itself to "the rest of the viewport below this
  // header" — it needs this header's real rendered height, which differs
  // between the desktop nav row and the mobile row, and grows further when
  // the mobile menu opens. Measuring it here and exposing it as a CSS custom
  // property on the root element means any component can read the true
  // value without prop drilling, and it self-corrects if this markup ever
  // changes, instead of drifting out of sync with a hardcoded rem guess.
  useLayoutEffect(() => {
    const header = headerRef.current;
    if (!header) return;

    const setHeightVar = () => {
      document.documentElement.style.setProperty("--taskbar-height", `${header.getBoundingClientRect().height}px`);
    };
    setHeightVar();

    // Also re-measures on every subsequent change to this header's own box —
    // a breakpoint switch (desktop row <-> mobile row), the mobile menu
    // opening/closing, or a font swap reflowing the nav text — not just the
    // one-time initial measurement above.
    const resizeObserver = new ResizeObserver(setHeightVar);
    resizeObserver.observe(header);
    return () => resizeObserver.disconnect();
  }, []);

  return (
    <header ref={headerRef} className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white">
      <div className="hidden w-full grid-cols-3 items-center px-8 py-3 md:grid">
        <Logo linkClassName="flex w-fit items-center justify-self-start self-start" />

        <nav className="flex items-center justify-center gap-16 whitespace-nowrap font-instrument text-[30px] font-medium text-gray-800">
          <NavLinks linkClassName="text-gray-800 transition-colors hover:text-[#2460A4]" />
        </nav>

        <div />
      </div>

      <div className="flex items-center justify-between px-4 py-3 md:hidden">
        <Logo linkClassName="flex items-center" onClick={() => setOpen(false)} />
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          className="text-gray-800"
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile */}
      {open && (
        <div className="flex flex-col gap-4 border-t border-gray-200 bg-white px-4 py-4 font-instrument text-[28px] font-medium text-gray-800 md:hidden">
          <NavLinks linkClassName="text-gray-800" onLinkClick={() => setOpen(false)} />
        </div>
      )}
    </header>
  );
}
