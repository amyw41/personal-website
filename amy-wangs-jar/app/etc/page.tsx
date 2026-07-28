"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import PlateCircle from "@/components/Etc/PlateCircle";
import { useViewportWidth } from "@/components/WhatsInside/layout";
import { ETC_CATEGORIES, ETC_PHOTOS } from "@/lib/etc";

const CIRCLE_SIZE = 200;
const THUMB_SIZE = 112; // desktop reference, matches the old h-28 w-28
const CLUSTER_WIDTH = CIRCLE_SIZE + 300; // 500 — desktop reference width
const CLUSTER_HEIGHT = CIRCLE_SIZE + 180; // 380 — desktop reference height
const PAGE_PADDING = 32; // matches this section's own px-4 on each side
const STAGGER_STEP = 0.12;

// Hand-placed scatter offsets (px from the circle's own top-left corner, at
// the CLUSTER_WIDTH/CIRCLE_SIZE reference scale — see `scale` below),
// cycled if a category ever grows past 7 photos. x stays right of the
// circle's own center (100) the whole way down so a full 7-photo cluster
// still doesn't bury the label under it.
const SCATTER = [
  { x: 130, y: -25, rotate: -6 },
  { x: 195, y: 15, rotate: 9 },
  { x: 150, y: 70, rotate: -11 },
  { x: 220, y: 105, rotate: 6 },
  { x: 170, y: 150, rotate: -9 },
  { x: 235, y: 185, rotate: 8 },
  { x: 130, y: 205, rotate: -4 },
];

export default function EtcPage() {
  // The whole cluster (circle + scatter) used to be a fixed 500x300px box
  // regardless of viewport — comfortably wider than any phone. Scaling every
  // dimension by the same factor (measured available width / the reference
  // width) keeps the cluster's own proportions intact while guaranteeing it
  // never exceeds the viewport, at any width.
  const viewportWidth = useViewportWidth();
  const available = Math.max(viewportWidth - PAGE_PADDING, 240);
  const scale = viewportWidth === 0 ? 1 : Math.min(available / CLUSTER_WIDTH, 1);
  const circleSize = CIRCLE_SIZE * scale;
  const thumbSize = THUMB_SIZE * scale;

  // startIndex is each category's running offset across ALL categories'
  // photos in page order, so the entrance stagger reads top-to-bottom across
  // the whole page rather than restarting per category.
  const categories = ETC_CATEGORIES.map((cat, idx) => {
    const startIndex = ETC_CATEGORIES.slice(0, idx).reduce(
      (sum, c) => sum + ETC_PHOTOS[c.slug].length,
      0
    );
    return { ...cat, photos: ETC_PHOTOS[cat.slug], startIndex };
  });

  return (
    <section className="mx-auto w-full max-w-5xl px-4 pb-36 pt-20 text-center">
      <h1 className="font-singsong text-[clamp(2rem,6vw,3.5rem)] leading-none text-[#2460A4]">
        What&apos;s on my plate?
      </h1>
      <p className="mt-3 font-roboto text-lg font-light text-gray-500">Welcome to My Mind.</p>

      <div className="mx-auto mt-20 flex flex-col gap-20">
        {categories.map((cat, idx) => (
          <div key={cat.slug} className={`flex ${idx % 2 === 0 ? "justify-start" : "justify-end"}`}>
            <Link
              href={`/etc/${cat.slug}`}
              aria-label={`View ${cat.label} photos`}
              className="relative block"
              style={{ width: CLUSTER_WIDTH * scale, height: CLUSTER_HEIGHT * scale }}
            >
              <PlateCircle label={cat.label} size={circleSize} className="absolute left-0 top-0" />
              {cat.photos.map((photo, i) => {
                const offset = SCATTER[i % SCATTER.length];
                return (
                  <motion.div
                    key={photo.src}
                    initial={{ opacity: 0, y: -70 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.6,
                      ease: "easeOut",
                      delay: (cat.startIndex + i) * STAGGER_STEP,
                    }}
                    className="absolute overflow-hidden rounded-sm shadow-md"
                    style={{
                      left: offset.x * scale,
                      top: offset.y * scale,
                      width: thumbSize,
                      height: thumbSize,
                      rotate: offset.rotate,
                      zIndex: i,
                    }}
                  >
                    <Image src={photo.src} alt="" fill sizes={`${Math.round(thumbSize)}px`} className="object-cover" />
                  </motion.div>
                );
              })}
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}
