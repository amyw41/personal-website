"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import PlateCircle from "@/components/Etc/PlateCircle";
import { ETC_CATEGORIES, ETC_PHOTOS } from "@/lib/etc";

const CIRCLE_SIZE = 200;
const STAGGER_STEP = 0.12;

// Hand-placed scatter offsets (px from the circle's own top-left corner),
// cycled if a category ever grows past 7 photos.
// x stays right of the circle's own center (100) the whole way down so a
// full 7-photo cluster still doesn't bury the label under it.
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
              style={{ width: CIRCLE_SIZE + 300, height: CIRCLE_SIZE + 180 }}
            >
              <PlateCircle label={cat.label} size={CIRCLE_SIZE} className="absolute left-0 top-0" />
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
                    className="absolute h-24 w-24 overflow-hidden rounded-sm shadow-md sm:h-28 sm:w-28"
                    style={{ left: offset.x, top: offset.y, rotate: offset.rotate, zIndex: i }}
                  >
                    <Image src={photo.src} alt="" fill sizes="112px" className="object-cover" />
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
