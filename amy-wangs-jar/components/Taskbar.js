"use client";

import Link from "next/link";
import Image from "next/image";

import { useState } from "react";
import { Menu, X } from "lucide-react";

const NAV_LINKS = [
  { label: "Portfolio", href: "https://amywang.framer.website", external: true },
  { label: "Etc", href: "/etc" },
  { label: "Notes", href: "/notes" },
];

// Horizontal positions are percentages of a 1512px reference frame — see Footer.js
// for why (scales proportionally instead of pinning to literal px).
const FRAME_WIDTH = 1512;
const pct = (x) => `${((x / FRAME_WIDTH) * 100).toFixed(3)}%`;



export default function Taskbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white">
      <div className="hidden w-full grid-cols-3 items-center px-8 py-3 md:grid">
        <Link href="/" className="flex w-fit items-center justify-self-start self-start">
          <Image
            src="/images/logo.png"
            alt="Amy Wang's Jar logo"
            width={32}
            height={32}
            priority
            className="h-8 w-8 object-contain"
          />
        </Link>

        <nav className="flex items-center justify-center gap-16 whitespace-nowrap font-instrument text-[30px] font-medium text-gray-800">
          {NAV_LINKS.map((link) =>
            link.external ? (
              <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer" className="text-gray-800 transition-colors hover:text-[#2460A4]">
                {link.label}
              </a>
            ) : (
              <Link key={link.label} href={link.href} className="text-gray-800 transition-colors hover:text-[#2460A4]">
                {link.label}
              </Link>
            )
          )}
        </nav>

        <div />
      </div>

      <div className="flex items-center justify-between px-4 py-3 md:hidden">
        <Link href="/" onClick={() => setOpen(false)} className="flex items-center">
          <Image
            src="/images/logo.png"
            alt="Amy Wang's Jar logo"
            width={32}
            height={32}
            priority
            className="h-8 w-8 object-contain"
          />
        </Link>
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
          {NAV_LINKS.map((link) =>
            link.external ? (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-800"
                onClick={() => setOpen(false)}
              >
                {link.label}
              </a>
            ) : (
              <Link key={link.label} href={link.href} className="text-gray-800" onClick={() => setOpen(false)}>
                {link.label}
              </Link>
            )
          )}
        </div>
      )}


    </header>
  );
}
