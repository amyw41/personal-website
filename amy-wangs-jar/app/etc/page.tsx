"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import PlateCircle from "@/components/Etc/PlateCircle";
import { useViewportWidth } from "@/components/WhatsInside/layout";
import { ETC_CATEGORIES, ETC_PHOTOS, type EtcPhoto } from "@/lib/etc";

const CIRCLE_SIZE = 200;
const THUMB_HEIGHT = 180; // desktop reference height — width follows each photo's own aspect ratio, never cropped
const BASE_X = 140; // gap from the circle's own left edge to the first photo
const OVERLAP = 0.55; // each next photo starts this far into the previous one's width, fanning the row out sideways instead of stacking down
const PAGE_PADDING = 32; // matches this section's own px-4 on each side
const STAGGER_STEP = 0.12;

// Small vertical jitter so the fan doesn't read as a dead-straight row, cycled
// past 7 photos. Kept shallow (and always positive) so the spread stays
// mostly horizontal instead of drifting down the page.
const Y_JITTER = [10, 55, 25, 70, 15, 60, 35];

type PhotoLayout = { photo: EtcPhoto; x: number; y: number; width: number; height: number };

// Lays photos out left-to-right at their own native aspect ratio (no square
// cropping) — each one's width comes from THUMB_HEIGHT scaled by its own
// intrinsic width/height, and the next photo's x is derived from where the
// previous one actually ended, so the row keeps a consistent fanned overlap
// no matter how wide or narrow each photo is.
function layoutPhotos(photos: EtcPhoto[]): PhotoLayout[] {
  let cursorX = BASE_X;
  return photos.map((photo, i) => {
    const width = THUMB_HEIGHT * (photo.width / photo.height);
    const x = cursorX;
    const y = Y_JITTER[i % Y_JITTER.length];
    cursorX += width * OVERLAP;
    return { photo, x, y, width, height: THUMB_HEIGHT };
  });
}

export default function EtcPage() {
  const viewportWidth = useViewportWidth();

  const categories = ETC_CATEGORIES.map((cat) => {
    const layout = layoutPhotos(ETC_PHOTOS[cat.slug]);
    const clusterWidth = layout.reduce((m, p) => Math.max(m, p.x + p.width), CIRCLE_SIZE);
    const clusterHeight = layout.reduce((m, p) => Math.max(m, p.y + p.height), CIRCLE_SIZE);
    return { ...cat, photos: layout, clusterWidth, clusterHeight };
  });

  // The whole cluster (circle + photo fan) is scaled by the same factor
  // (measured available width / the widest category's own reference width)
  // so every plate shares one visual scale and never exceeds the viewport.
  const referenceWidth = Math.max(...categories.map((c) => c.clusterWidth));
  const available = Math.max(viewportWidth - PAGE_PADDING, 240);
  const scale = viewportWidth === 0 ? 1 : Math.min(available / referenceWidth, 1);
  const circleSize = CIRCLE_SIZE * scale;

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
              style={{ width: cat.clusterWidth * scale, height: cat.clusterHeight * scale }}
            >
              <PlateCircle label={cat.label} size={circleSize} className="absolute left-0 top-0" />
              {cat.photos.map(({ photo, x, y, width, height }, i) => (
                <motion.div
                  key={photo.src}
                  initial={{ opacity: 0, y: -70 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.4 }}
                  transition={{
                    duration: 0.6,
                    ease: "easeOut",
                    delay: i * STAGGER_STEP,
                  }}
                  className="absolute overflow-hidden rounded-sm shadow-md"
                  style={{
                    left: x * scale,
                    top: y * scale,
                    width: width * scale,
                    height: height * scale,
                    zIndex: i,
                  }}
                >
                  <Image
                    src={photo.src}
                    alt=""
                    fill
                    sizes={`${Math.round(width * scale)}px`}
                    className="object-cover"
                  />
                </motion.div>
              ))}
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}
