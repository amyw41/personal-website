"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import PlateCircle from "@/components/Etc/PlateCircle";
import type { EtcCategorySlug } from "@/lib/etc";

// How long a plate takes to slide up into view — on page load for the
// heading, and again per-category (matching Carousel.tsx's own reveal) as
// each plate scrolls into the viewport — before that category's photos
// start their roll-out (below), so the two entrances read as sequential
// instead of overlapping.
const SLIDE_UP_DURATION = 0.6;
const STAGGER_STEP = 0.12;

// Fixed desktop collage — a poster-style composition, not a responsive one.
// The stage below is a literal 1277x1999px box that never grows or shrinks
// with the viewport (see EtcPage: no scale factor anywhere, just
// overflow-x-auto so a narrower window scrolls instead of squishing it).
const STAGE_WIDTH = 1277;
const STAGE_HEIGHT = 1999;
const PLATE_SIZE = 280; // estimate — the mockup didn't give an exact measurement for the plate's own diameter

type CollagePhoto = {
  src: string;
  caption: string;
  xPct: number; // left, as a % of STAGE_WIDTH
  yPct: number; // top, as a % of STAGE_HEIGHT
  width: number; // literal px, mockup-measured — matches the stage's own fixed coordinate space
  height: number;
  z: number;
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
        caption: "Graphite portrait on a cow-print background.",
        xPct: 27.099,
        yPct: 11.775,
        width: 202,
        height: 269,
        z: 1,
      },
      {
        src: "/images/etc/drawing2.png",
        caption: "Reference photo next to the finished sketch.",
        xPct: 34.374,
        yPct: 15.975,
        width: 222,
        height: 224,
        z: 2,
      },
      {
        src: "/images/etc/drawing3.png",
        caption: "Colored pencil self-portrait with a disposable camera.",
        xPct: 38.199,
        yPct: 7.975,
        width: 203,
        height: 206,
        z: 3,
      },
      {
        src: "/images/etc/drawing4.png",
        caption: "Digital portrait study in blue.",
        xPct: 46.224,
        yPct: 13.875,
        width: 179,
        height: 223,
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
        xPct: 30.858,
        yPct: 64.764,
        width: 298,
        height: 223,
        z: 1,
      },
      {
        src: "/images/etc/dance2.png",
        caption: "Chinese classical dance performance.",
        xPct: 34.533,
        yPct: 71.439,
        width: 223,
        height: 167,
        z: 2,
      },
      {
        src: "/images/etc/dance3.png",
        caption: "Korean traditional hanbok dance.",
        xPct: 45.933,
        yPct: 72.639,
        width: 189,
        height: 284,
        z: 3,
      },
      {
        src: "/images/etc/dance4.png",
        caption: "Fan dance in blue stage light.",
        xPct: 41.133,
        yPct: 61.164,
        width: 290,
        height: 193,
        z: 4,
      },
      {
        src: "/images/etc/dance5.png",
        caption: "Extension into an arabesque.",
        xPct: 53.358,
        yPct: 66.039,
        width: 248,
        height: 165,
        z: 5,
      },
      {
        src: "/images/etc/dance6.png",
        caption: "Backstage at the Abstract Dance Challenge.",
        xPct: 62.108,
        yPct: 56.989,
        width: 176,
        height: 234,
        z: 6,
      },
      {
        src: "/images/etc/dance7.png",
        caption: "Fan in hand, between poses.",
        xPct: 69.708,
        yPct: 65.664,
        width: 218,
        height: 145,
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

export default function EtcPage() {
  return (
    <section className="w-full px-4 pb-36 pt-20 text-center">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: SLIDE_UP_DURATION, ease: "easeOut" }}
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
                >
                  <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.3 }}
                    transition={{ duration: SLIDE_UP_DURATION, ease: "easeOut" }}
                  >
                    <PlateCircle label={cat.label} size={cat.plateSize} />
                  </motion.div>
                </Link>

                {cat.photos.map((photo, i) => (
                  <Link
                    key={photo.src}
                    href={`/etc/${cat.slug}`}
                    aria-label={`View ${cat.label} photos`}
                    className="absolute block"
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
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.4 }}
                      transition={{
                        duration: 0.6,
                        ease: "easeOut",
                        delay: SLIDE_UP_DURATION + i * STAGGER_STEP,
                      }}
                      className="relative h-full w-full overflow-hidden rounded-sm shadow-md"
                    >
                      <Image
                        src={photo.src}
                        alt=""
                        fill
                        sizes={`${Math.round(photo.width)}px`}
                        className="object-cover"
                      />
                    </motion.div>
                  </Link>
                ))}
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </section>
  );
}
