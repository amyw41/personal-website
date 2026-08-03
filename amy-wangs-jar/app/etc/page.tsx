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

type CollagePhoto = {
  src: string;
  caption: string;
  x: number;
  y: number;
  width: number;
  height: number;
  z: number;
};

type CollageCategory = {
  slug: EtcCategorySlug;
  label: string;
  plateX: number;
  plateY: number;
  plateSize: number;
  photos: CollagePhoto[];
};

// Fixed desktop collage layout — every position/size below is a literal,
// final pixel value (this is a poster-style composition, not a responsive
// one: it renders identically at any window width, see STAGE_WIDTH/HEIGHT
// and the overflow-x-auto wrapper below). These numbers aren't freehanded —
// they're the resolved output of the previous anchor-point + compacting +
// plate-attaching + viewport-scale pipeline, captured at scale 1 once that
// pipeline's tuning (density, overlap, per-photo z/size overrides) was
// finalized by eye across many iterations. Editing one photo now just means
// changing that photo's own x/y/width/height/z here — nothing else to trace
// through or recompute.
const GALLERY: CollageCategory[] = [
  {
    slug: "drawing",
    label: "Drawing",
    plateX: 180,
    plateY: 240,
    plateSize: 280,
    photos: [
      {
        src: "/images/etc/drawing1.png",
        caption: "Graphite portrait on a cow-print background.",
        x: 293.81,
        y: 215.25,
        width: 97.62,
        height: 130,
        z: 1,
      },
      {
        src: "/images/etc/drawing2.png",
        caption: "Reference photo next to the finished sketch.",
        x: 387.56,
        y: 300,
        width: 128.84,
        height: 130,
        z: 2,
      },
      {
        src: "/images/etc/drawing3.png",
        caption: "Colored pencil self-portrait with a disposable camera.",
        x: 435.56,
        y: 180,
        width: 128.11,
        height: 130,
        z: 3,
      },
      {
        src: "/images/etc/drawing4.png",
        caption: "Digital portrait study in blue.",
        x: 538.31,
        y: 257.25,
        width: 104.35,
        height: 130,
        z: 4,
      },
    ],
  },
  {
    slug: "nails",
    label: "Nails",
    plateX: 970,
    plateY: 664,
    plateSize: 280,
    photos: [],
  },
  {
    slug: "dancing",
    label: "Dancing",
    plateX: 180,
    plateY: 1391,
    plateSize: 280,
    photos: [
      {
        src: "/images/etc/dance1.png",
        caption: "Curtain call after a group recital.",
        x: 331.86,
        y: 1392.5,
        width: 173.72,
        height: 130,
        z: 1,
      },
      {
        // Pushed behind everything as a deliberate background layer — its
        // size is a bit smaller than the shared default so it holds its own
        // on-screen footprint without dominating the layer stacked on top.
        src: "/images/etc/dance2.png",
        caption: "Chinese classical dance performance.",
        x: 379.11,
        y: 1488.5,
        width: 168.25,
        height: 126,
        z: 0,
      },
      {
        // Sent to the very back (below dance2) and enlarged since it's now
        // the furthest-back layer.
        src: "/images/etc/dance3.png",
        caption: "Korean traditional hanbok dance.",
        x: 524.61,
        y: 1505,
        width: 121.12,
        height: 182,
        z: -1,
      },
      {
        src: "/images/etc/dance4.png",
        caption: "Fan dance in blue stage light.",
        x: 463.11,
        y: 1319.75,
        width: 195.34,
        height: 130,
        z: 4,
      },
      {
        src: "/images/etc/dance5.png",
        caption: "Extension into an arabesque.",
        x: 619.86,
        y: 1418,
        width: 195.39,
        height: 130,
        z: 5,
      },
      {
        // A narrow portrait crop sandwiched between wider landscape
        // neighbors — bumped above everyone else in the stack so it doesn't
        // get buried behind them.
        src: "/images/etc/dance6.png",
        caption: "Backstage at the Abstract Dance Challenge.",
        x: 705.36,
        y: 1277,
        width: 97.78,
        height: 130,
        z: 9,
      },
      {
        src: "/images/etc/dance7.png",
        caption: "Fan in hand, between poses.",
        x: 790.11,
        y: 1409.75,
        width: 195.45,
        height: 130,
        z: 7,
      },
    ],
  },
  {
    slug: "content",
    label: "Content",
    plateX: 963,
    plateY: 1866,
    plateSize: 280,
    photos: [],
  },
];

// Padding around the outermost plate/photo anchors so nothing clips at the
// stage's own edge — covers a plate's own radius (140) plus a little
// breathing room past the widest photo thumbnail.
const STAGE_PADDING = 180;

function computeStageSize(gallery: CollageCategory[]) {
  const xs = gallery.flatMap((cat) => [cat.plateX, ...cat.photos.map((p) => p.x)]);
  const ys = gallery.flatMap((cat) => [cat.plateY, ...cat.photos.map((p) => p.y)]);
  return {
    width: Math.max(...xs) - Math.min(...xs) + STAGE_PADDING * 2,
    height: Math.max(...ys) - Math.min(...ys) + STAGE_PADDING * 2,
  };
}

const { width: STAGE_WIDTH, height: STAGE_HEIGHT } = computeStageSize(GALLERY);

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
                    left: cat.plateX,
                    top: cat.plateY,
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
                      left: photo.x,
                      top: photo.y,
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
