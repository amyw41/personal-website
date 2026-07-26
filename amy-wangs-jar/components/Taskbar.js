"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
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

function getBreadcrumb(pathname) {
  if (pathname === "/") return "home";
  const segments = pathname.split("/").filter(Boolean);
  return ["home", ...segments].join(" / ");
}

export default function Taskbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white">
      <div className="relative hidden h-11 w-full md:block">
        <Link href="/" className="absolute flex items-center" style={{ left: pct(14), top: 7 }}>
          <Image
            src="/images/logo.png"
            alt="Amy Wang's Jar logo"
            width={32}
            height={32}
            priority
            className="h-8 w-8 object-contain"
          />
        </Link>

        <nav
          className="absolute flex items-center gap-8 whitespace-nowrap font-instrument text-sm font-medium text-gray-800"
          style={{ left: pct(584), top: 12 }}
        >
          {NAV_LINKS.map((link) =>
            link.external ? (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-gray-500"
              >
                {link.label}
              </a>
            ) : (
              <Link
                key={link.label}
                href={link.href}
                className="transition-colors hover:text-gray-500"
              >
                {link.label}
              </Link>
            )
          )}
        </nav>
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

      {open && (
        <div className="flex flex-col gap-4 border-t border-gray-200 bg-white px-4 py-4 font-instrument text-sm font-medium text-gray-800 md:hidden">
          {NAV_LINKS.map((link) =>
            link.external ? (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
              >
                {link.label}
              </a>
            ) : (
              <Link key={link.label} href={link.href} onClick={() => setOpen(false)}>
                {link.label}
              </Link>
            )
          )}
        </div>
      )}

      <div className="border-t border-gray-100 px-4 py-1.5 sm:px-8">
        <p className="font-roboto text-xs text-gray-400">{getBreadcrumb(pathname)}</p>
      </div>
    </header>
  );
}
