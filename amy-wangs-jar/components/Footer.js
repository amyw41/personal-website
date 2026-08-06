"use client";

import { usePathname } from "next/navigation";
import { pct } from "@/lib/frame";
import { SOCIAL_LINKS } from "@/lib/social";

// The category detail page ("What's on my plate?" > a category) clips its
// plate right at the viewport fold (see app/etc/[category]/page.tsx's height
// calc) so the footer starts exactly where the plate cuts off — the usual
// pt-24 breathing room below would just reopen that gap as blank space.
const NO_GAP_PATTERN = /^\/etc\/[^/]+$/;

// Vertical offsets below stay literal since they're small positions inside
// fixed-height bars, not values meant to stretch with width.
const REPEAT_COUNT = 8;

const SOCIAL_TEXT_LINKS = SOCIAL_LINKS.filter((s) => s.inFooter).map((s) => ({
  label: s.footerLabel ?? s.label,
  href: s.href,
}));

function MarqueeGroup() {
  return (
    <div className="flex shrink-0 items-center">
      {Array.from({ length: REPEAT_COUNT }).map((_, i) => (
        <span
          key={i}
          className="whitespace-nowrap px-10 font-singsong text-[100px] font-bold leading-none text-white sm:text-[140px] lg:text-[180px]"
        >
          THANKS FOR VISITING •
        </span>
      ))}
    </div>
  );
}

export default function Footer() {
  const pathname = usePathname();
  const noGap = NO_GAP_PATTERN.test(pathname);

  return (
    // pt-24 is the "space before Footer" rule — it lives here instead of as
    // padding-bottom on <main> so it's Footer's own responsibility regardless
    // of which section happens to render last above it. Skipped on the one
    // route that already ends flush against the fold (see NO_GAP_PATTERN).
    <footer className={`mt-auto w-full ${noGap ? "" : "pt-24"}`}>
      <div className="relative h-[350px] w-full overflow-hidden bg-[#2460A4]">
        <div className="absolute inset-x-0 top-0 h-[70px]">
          <div
            className="absolute flex items-center gap-3 whitespace-nowrap font-roboto text-base text-white"
            style={{ left: pct(29), top: 34 }}
          >
            {SOCIAL_TEXT_LINKS.map((social, i) => (
              <span key={social.label} className="flex items-center gap-3">
                <a
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors hover:text-black"
                >
                  {social.label}
                </a>
                {i < SOCIAL_TEXT_LINKS.length - 1 && <span aria-hidden="true">•</span>}
              </span>
            ))}
          </div>
        </div>

        {/* Centered in the space between the social row above and the black bar below, so it stays equidistant from both regardless of the marquee's rendered font size at each breakpoint. */}
        {/* Purely decorative repeating banner — hidden from assistive tech as
            a whole (rather than leaving the first copy exposed) since it's
            the same phrase read out 8 times in a row with no unique info. */}
        <div
          className="absolute inset-x-0 bottom-0 top-[70px] flex items-center overflow-hidden"
          aria-hidden="true"
        >
          <div className="flex w-max animate-marquee">
            <MarqueeGroup />
            <MarqueeGroup />
          </div>
        </div>
      </div>

      {/* Below sm, these stack in normal flow instead of absolute-positioning
          from opposite edges — at narrow widths the two nowrap strings had
          nowhere to go but overlap each other in the middle. */}
      <div className="relative flex w-full flex-col items-center gap-1 bg-black px-4 py-3 text-center sm:h-11 sm:px-0 sm:py-0 sm:text-left">
        <p className="font-roboto text-sm text-white sm:absolute sm:left-[1.918%] sm:top-[11px]">
          Designed + coded by me (© 2026) • with 200 hrs on{" "}
          <a
            href="https://open.spotify.com/user/lial0x5vxkue34cmvahelkx4y?si=67c6719b29d7425a"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-[#2460A4]"
          >
            Spotify
          </a>
        </p>
        <p className="font-roboto text-sm text-white sm:absolute sm:right-[1.918%] sm:top-[11px]">
          Looking for my{" "}
          <a
            href="https://amywang.framer.website"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-[#2460A4]"
          >
            portfolio?
          </a>
        </p>
      </div>
    </footer>
  );
}
