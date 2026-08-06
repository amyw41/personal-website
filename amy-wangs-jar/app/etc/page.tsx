"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import PlateCircle from "@/components/Etc/PlateCircle";
import type { EtcCategorySlug } from "@/lib/etc";

// How long a plate takes to slide up into view — on page load for the
// heading, and again per-category (matching Carousel.tsx's own reveal) as
// each plate scrolls into the viewport — before that category's photos
// start their roll-out (below), so the two entrances read as sequential
// instead of overlapping. Kept short so scrolling down feels responsive
// instead of laggy.
const SLIDE_UP_DURATION = 0.35;
const PHOTO_DURATION = 0.35;
const STAGGER_STEP = 0.03;
// How much of an element needs to be on-screen before its whileInView
// entrance fires — lower than Carousel.tsx's own 0.3 so plates/photos start
// animating as soon as they're barely in view, instead of waiting for a
// third of them to have scrolled past the fold first.
const VIEWPORT_AMOUNT = 0.1;

// Fixed desktop collage — a poster-style composition, not a responsive one.
// The stage below is a fixed-width box that never grows or shrinks with the
// viewport (see EtcPage: no scale factor anywhere, just overflow-x-auto so
// a narrower window scrolls instead of squishing it). Its height is
// computed below from GALLERY itself, not hardcoded — see computeStageHeight.
const STAGE_WIDTH = 1277;
const PLATE_SIZE = 480; // estimate — the mockup didn't give an exact measurement for the plate's own diameter

type CollagePhoto = {
  src: string;
  caption: string;
  xPct: number; // left, as a % of STAGE_WIDTH
  yPct: number; // top, as a % of STAGE_HEIGHT
  width: number; // literal px, mockup-measured — matches the stage's own fixed coordinate space
  height: number;
  z: number;
  extraDelay?: number; // added on top of the usual rank-based stagger delay, for a photo that should noticeably lag behind the rest
};

type CollageCategory = {
  slug: EtcCategorySlug;
  label: string;
  plateXPct: number;
  plateYPct: number;
  plateSize: number;
  photos: CollagePhoto[];
};

// Every position/size below is mockup-measured, then run through two passes
// by hand: each category's photos were pulled ~25% in toward their own
// group's center (the raw mockup anchors read as separate floating photos,
// not the dense overlapping stack the reference shows), and the whole
// cluster was then shifted so its nearest photo bites ~75px into its
// plate's edge (the raw anchors merely touch the plate, not overlap it).
// These are the resolved numbers from that tuning — editing one photo now
// just means changing its own field here directly, nothing to recompute.
const GALLERY: CollageCategory[] = [
  {
    slug: "drawing",
    label: "Drawing",
    plateXPct: 14.1,
    plateYPct: 9.7,
    plateSize: PLATE_SIZE,
    photos: [
      {
        src: "/images/etc/drawing1.png",
        caption: "Niu Zaizai - 2023.",
        xPct: 30,
        yPct: 10,
        width: 202,
        height: 269,
        z: 1,
      },
      {
        src: "/images/etc/drawing2.png",
        caption: "Jo Yuri (Squid Games) - 2025.",
        xPct: 42,
        yPct: 14,
        width: 222,
        height: 224,
        z: 2,
      },
      {
        src: "/images/etc/drawing3.png",
        caption: "Cha Woongki (AHOF) - 2023.",
        xPct: 45,
        yPct: 7,
        width: 233,
        height: 236,
        z: 3,
      },
      {
        src: "/images/etc/drawing4.png",
        caption: "Chihen (WIP, AHOF) - 2026).",
        xPct: 57,
        yPct: 11,
        width: 209,
        height: 253,
        z: 4,
      },
    ],
  },
  {
    slug: "nails",
    label: "Nails",
    plateXPct: 76.0,
    plateYPct: 30.9,
    plateSize: PLATE_SIZE,
    photos: [],
  },
  {
    slug: "dancing",
    label: "Dancing",
    plateXPct: 14.1,
    plateYPct: 67.2,
    plateSize: PLATE_SIZE,
    photos: [
      {
        src: "/images/etc/dance1.png",
        caption: "Curtain call after a group recital.",
        xPct: 33,
        yPct: 65,
        width: 288,
        height: 213,
        z: 1,
      },
      {
        src: "/images/etc/dance2.png",
        caption: "Chinese classical dance performance.",
        xPct: 36,
        yPct: 71,
        width: 253,
        height: 180,
        z: 5,
      },
      {
        src: "/images/etc/dance3.png",
        caption: "Korean traditional hanbok dance.",
        xPct: 52.5,
        yPct: 67.5,
        width: 220,
        height: 290,
        z: 3,
      },
      {
        src: "/images/etc/dance4.png",
        caption: "Fan dance in blue stage light.",
        xPct: 50,
        yPct: 61.5,
        width: 290,
        height: 193,
        z: 4,
      },
      {
        src: "/images/etc/dance5.png",
        caption: "Extension into an arabesque.",
        xPct: 66,
        yPct: 63.5,
        width: 280,
        height: 185,
        z: 5,
      },
      {
        src: "/images/etc/dance6.png",
        caption: "Backstage at the Abstract Dance Challenge.",
        xPct: 74,
        yPct: 58,
        width: 186,
        height: 244,
        z: 5,
      },
      {
        src: "/images/etc/dance7.png",
        caption: "Fan in hand, between poses.",
        xPct: 86,
        yPct: 63,
        width: 238,
        height: 159,
        z: 7,
      },
    ],
  },
  {
    slug: "content",
    label: "Content",
    plateXPct: 75.4,
    plateYPct: 91.0,
    plateSize: PLATE_SIZE,
    photos: [],
  },
];

// Where a photo falls in its category's own top-to-bottom order (0 =
// highest up), independent of the order it's listed in GALLERY.
function topToBottomRank(photos: CollagePhoto[], target: CollagePhoto): number {
  return [...photos].sort((a, b) => a.yPct - b.yPct).indexOf(target);
}

// Since every element is positioned by `top: yPct%`, a taller container
// pushes every element further down for the *same* percentage — so the
// container's own height can't just be guessed once and left alone; it has
// to satisfy whichever element sits closest to the top or bottom edge for
// its own size. This solves that directly: for a plate/photo centered at
// yPct with the given pixel size, the smallest container height that keeps
// it from clipping top or bottom is size/2 divided by the smaller of yPct
// and (100 - yPct). Taking the max of that across everything in GALLERY
// gives a height that always fits the content, however PLATE_SIZE or any
// position changes later — no more re-guessing a literal number by hand.
//
// It also has to account for each element's own *unsettled* whileInView
// state, not just its resting size: a plate/photo below the fold sits at
// its `initial` transform offset (translated, not yet animated in) until
// scrolled into view, and CSS counts that transformed position toward the
// nearest scrollable ancestor's overflow — so on first load, before
// anything below the fold has been scrolled to, those still-offset
// elements stick out past a tightly-fit container and force a scrollbar
// that then disappears element-by-element as each one settles into place.
// PLATE_SLIDE_OFFSET/PHOTO_SLIDE_OFFSET below match the y values in each
// motion.div's own `initial` prop, so the container is sized for their
// worst-case (unsettled) extent, not just their resting one.
const PLATE_SLIDE_OFFSET = 40; // matches the plate motion.div's initial y
const PHOTO_SLIDE_OFFSET = 70; // matches the photo motion.div's initial y (upward, so it only affects the top edge)
// Small flat safety margin on top of the precise calc below — covers the
// page-level heading wrapper's own initial y:40 mount animation (which
// isn't scroll-gated like the plate/photo ones above, so it briefly offsets
// the whole stage on first paint regardless of scroll position) plus
// general rounding.
const STAGE_HEIGHT_PADDING = 48;

function requiredStageHeight(yPct: number, size: number, topExtra: number, bottomExtra: number): number {
  const half = size / 2;
  const fraction = yPct / 100;
  return Math.max((half + topExtra) / fraction, (half + bottomExtra) / (1 - fraction));
}

function computeStageHeight(gallery: CollageCategory[]): number {
  let required = 0;
  for (const cat of gallery) {
    // Plate slides up from below (initial y:40) — only its bottom edge
    // needs the extra room.
    required = Math.max(required, requiredStageHeight(cat.plateYPct, cat.plateSize, 0, PLATE_SLIDE_OFFSET));
    for (const photo of cat.photos) {
      // Photo drops in from above (initial y:-70) — only its top edge
      // needs the extra room.
      required = Math.max(required, requiredStageHeight(photo.yPct, photo.height, PHOTO_SLIDE_OFFSET, 0));
    }
  }
  return Math.ceil(required) + STAGE_HEIGHT_PADDING;
}

const STAGE_HEIGHT = computeStageHeight(GALLERY);

export default function EtcPage() {
  const router = useRouter();
  // Next.js unmounts this page the instant a Link navigation fires, with no
  // chance to play an exit animation — so clicking a plate instead flips
  // this (storing which category it was headed to), lets the page
  // fade+slide up (continuing the same upward direction the entrance
  // arrived from) and only navigates once that animation actually
  // finishes. Matches the category detail page's own back-button exit.
  const [exitHref, setExitHref] = useState<string | null>(null);
  // Which categories' plates have entered the viewport — the single shared
  // trigger every one of that category's photos keys off (see the photo
  // motion.div below). Each photo used to carry its own whileInView, which
  // fires the moment *that photo* individually crosses the viewport
  // threshold — for a category's higher-up photos that happens within a
  // few pixels of each other, so their rank-based delays read as intended,
  // but a photo further down the cluster crosses the threshold later (more
  // real scroll time has passed) and then gets the same fixed delay
  // stacked on top of that late start, breaking the steady cadence for
  // everything after the first couple. Anchoring all of a category's
  // photos to one shared moment (the plate's own entry) instead keeps the
  // stagger uniform regardless of how spread out the photos are on screen.
  const [revealedCats, setRevealedCats] = useState<Set<EtcCategorySlug>>(new Set());

  return (
    <section className="w-full px-4 pb-36 pt-20 text-center">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: exitHref ? 0 : 1, y: exitHref ? -16 : 0 }}
        transition={{ duration: exitHref ? 0.4 : SLIDE_UP_DURATION, ease: "easeOut" }}
        onAnimationComplete={() => {
          if (exitHref) router.push(exitHref);
        }}
      >
        <h1 className="font-singsong text-[clamp(2rem,6vw,3.5rem)] leading-none text-[#2460A4]">
          What&apos;s on my plate?
        </h1>
        <p className="mt-3 font-roboto text-lg font-light text-gray-500">Welcome to My Mind.</p>

        {/* Desktop-only fixed composition — never rescales with the
            viewport. Narrower windows scroll horizontally instead of
            squishing the artwork. */}
        <div className="w-full overflow-x-auto">
          <div className="relative mx-auto mt-20" style={{ width: STAGE_WIDTH, height: STAGE_HEIGHT }}>
            {GALLERY.map((cat) => (
              <div key={cat.slug}>
                <Link
                  href={`/etc/${cat.slug}`}
                  aria-label={`View ${cat.label} photos`}
                  className="absolute"
                  style={{
                    left: `${cat.plateXPct}%`,
                    top: `${cat.plateYPct}%`,
                    transform: "translate(-50%, -50%)",
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    setExitHref(`/etc/${cat.slug}`);
                  }}
                >
                  <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: VIEWPORT_AMOUNT }}
                    onViewportEnter={() =>
                      setRevealedCats((prev) => (prev.has(cat.slug) ? prev : new Set(prev).add(cat.slug)))
                    }
                    transition={{ duration: SLIDE_UP_DURATION, ease: "easeOut" }}
                  >
                    <PlateCircle label={cat.label} size={cat.plateSize} />
                  </motion.div>
                </Link>

                {cat.photos.map((photo) => (
                  // Plain div, not a Link — only the plate itself should
                  // navigate to /etc/{slug}; these photos are decorative.
                  <div
                    key={photo.src}
                    className="pointer-events-none absolute block"
                    style={{
                      left: `${photo.xPct}%`,
                      top: `${photo.yPct}%`,
                      width: photo.width,
                      height: photo.height,
                      transform: "translate(-50%, -50%)",
                      zIndex: photo.z,
                    }}
                  >
                    <motion.div
                      initial={{ opacity: 0, y: -70 }}
                      animate={revealedCats.has(cat.slug) ? { opacity: 1, y: 0 } : undefined}
                      transition={{
                        duration: PHOTO_DURATION,
                        ease: "easeOut",
                        // Ranked by each photo's own yPct (not array order) so
                        // whichever photo sits highest up the page rolls in
                        // first, matching the order they actually appear as
                        // you scroll down past the category — plus any
                        // photo-specific extraDelay on top, for a future
                        // one-off exception that should lag behind the rest.
                        delay:
                          SLIDE_UP_DURATION +
                          topToBottomRank(cat.photos, photo) * STAGGER_STEP +
                          (photo.extraDelay ?? 0),
                      }}
                      className="relative h-full w-full overflow-hidden shadow-md"
                    >
                      <Image
                        src={photo.src}
                        alt=""
                        fill
                        sizes={`${Math.round(photo.width)}px`}
                        className="object-cover"
                      />
                    </motion.div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </section>
  );
}
