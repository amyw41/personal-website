"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import PlateCircle from "@/components/Etc/PlateCircle";
import { useViewportWidth } from "@/components/WhatsInside/layout";
import { ETC_CATEGORIES, ETC_PHOTOS, type EtcCategorySlug } from "@/lib/etc";

// Was 200. A conservative bump so plate labels stay legible at the mockup's
// scale — nudge once checked against the reference again. This is the
// *reference* size at scale 1 (see `scale` below) — the actual rendered
// size always gets multiplied by scale, same as every position below.
const CIRCLE_SIZE = 280;
const THUMB_HEIGHT = 180; // reference height at scale 1 — width still follows each photo's own aspect ratio
const STAGGER_STEP = 0.12;
const PAGE_PADDING = 32; // matches this section's own px-4 (16px) on each side

type Point = readonly [number, number];

// Raw (x, y) anchors lifted straight from the reference mockup, in the
// mockup's own pixel space. These used to be divided by that mockup's full
// 4669x1628 *canvas* size to get a %, but the canvas is much wider than the
// cluster of plates actually drawn on it (the mockup only uses roughly the
// left fifth of it) — dividing by the full canvas is what squashed
// everything into a thin strip against the left edge. Instead we take the
// bounding box of just these points (below) and map *that* to the section,
// so the layout fills the page responsively no matter how much dead space
// surrounded it in the original mockup.
const RAW: Record<EtcCategorySlug, { plate: Point; photos: Point[] }> = {
  drawing: {
    plate: [106, 372],
    photos: [
      [431, 406],
      [556, 519],
      [620, 359],
      [757, 462],
    ],
  },
  nails: { plate: [896, 796], photos: [] },
  dancing: {
    plate: [106, 1523],
    photos: [
      [412, 1473],
      [475, 1651],
      [669, 1523],
      [587, 1376],
      [796, 1507],
      [910, 1319],
      [1023, 1496],
    ],
  },
  // Content's mockup y (1998) ran past the stated 1628-tall canvas — it no
  // longer needs special-casing now that positions are normalized against
  // the *actual* spread of points instead of that fixed canvas height.
  content: { plate: [889, 1998], photos: [] },
};

// How far the nearest photo's own edge should sit *into* the plate's edge —
// a small positive overlap so the cluster visibly touches the plate outline
// (like the reference mockup) instead of floating a gap away from it.
const ATTACH_OVERLAP = 24;

// The mockup's raw anchors don't all sit flush against their own plate —
// drawing's photos in particular start well clear of the circle's edge.
// This slides each category's whole photo cluster left/right as one rigid
// group (preserving their fan arrangement relative to each other) just far
// enough that its nearest photo edge touches the plate, computed from each
// photo's own actual on-screen width so it stays correct if photos change.
function attachPhotosToPlate(slug: EtcCategorySlug): Point[] {
  const { plate, photos } = RAW[slug];
  if (photos.length === 0) return photos;

  const plateRightEdge = plate[0] + CIRCLE_SIZE / 2;
  const nearestLeftEdge = Math.min(
    ...photos.map(([x], i) => {
      const photo = ETC_PHOTOS[slug][i];
      const halfWidth = (THUMB_HEIGHT * (photo.width / photo.height)) / 2;
      return x - halfWidth;
    })
  );
  const shiftX = plateRightEdge - ATTACH_OVERLAP - nearestLeftEdge;
  return photos.map(([x, y]) => [x + shiftX, y] as const);
}

for (const slug of Object.keys(RAW) as EtcCategorySlug[]) {
  RAW[slug].photos = attachPhotosToPlate(slug);
}

// Bounding box over every plate + photo anchor (now attached to their
// plates above), padded so a circle/photo centered exactly on an edge point
// doesn't clip the viewport. 180 covers the plate's own radius (140) plus a
// little breathing room past the widest photo thumbnail.
const PAD = 180;
const allPoints: Point[] = Object.values(RAW).flatMap((c) => [c.plate, ...c.photos]);
const minX = Math.min(...allPoints.map((p) => p[0])) - PAD;
const maxX = Math.max(...allPoints.map((p) => p[0])) + PAD;
const minY = Math.min(...allPoints.map((p) => p[1])) - PAD;
const maxY = Math.max(...allPoints.map((p) => p[1])) + PAD;
const rangeX = maxX - minX;
const rangeY = maxY - minY;

// Maps a raw mockup point to a *px* offset from the cluster's own top-left
// (still needs multiplying by `scale` before use — see below).
function toOffset([x, y]: Point) {
  return { x: x - minX, y: y - minY };
}

export default function EtcPage() {
  const viewportWidth = useViewportWidth();
  // The one factor that scales positions *and* element sizes together. Using
  // a CSS % for position while leaving photo/circle sizes as fixed px (the
  // previous version) is what made things read as "scattered" — the gaps
  // between elements grew with the viewport but the elements filling those
  // gaps stayed the same size, so everything drifted apart. Scaling both by
  // this same number keeps the whole cluster's proportions locked together
  // at any viewport width, like a single image being resized.
  const available = Math.max(viewportWidth - PAGE_PADDING, 240);
  const scale = viewportWidth === 0 ? 1 : available / rangeX;

  return (
    <section className="w-full px-4 pb-36 pt-20 text-center">
      <h1 className="font-singsong text-[clamp(2rem,6vw,3.5rem)] leading-none text-[#2460A4]">
        What&apos;s on my plate?
      </h1>
      <p className="mt-3 font-roboto text-lg font-light text-gray-500">Welcome to My Mind.</p>

      <div className="relative mx-auto mt-20" style={{ width: rangeX * scale, height: rangeY * scale }}>
        {ETC_CATEGORIES.map((cat) => {
          const { plate, photos: photoAnchors } = RAW[cat.slug];
          const platePos = toOffset(plate);
          const photos = ETC_PHOTOS[cat.slug];
          const circleSize = CIRCLE_SIZE * scale;

          return (
            <div key={cat.slug}>
              <Link
                href={`/etc/${cat.slug}`}
                aria-label={`View ${cat.label} photos`}
                className="absolute"
                style={{
                  left: platePos.x * scale,
                  top: platePos.y * scale,
                  transform: "translate(-50%, -50%)",
                }}
              >
                <PlateCircle label={cat.label} size={circleSize} />
              </Link>

              {photos.map((photo, i) => {
                const pos = toOffset(photoAnchors[i]);
                const height = THUMB_HEIGHT * scale;
                const width = height * (photo.width / photo.height);

                return (
                  <Link
                    key={photo.src}
                    href={`/etc/${cat.slug}`}
                    aria-label={`View ${cat.label} photos`}
                    className="absolute block"
                    style={{
                      left: pos.x * scale,
                      top: pos.y * scale,
                      width,
                      height,
                      transform: "translate(-50%, -50%)",
                      zIndex: i + 1,
                    }}
                  >
                    <motion.div
                      initial={{ opacity: 0, y: -70 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.4 }}
                      transition={{
                        duration: 0.6,
                        ease: "easeOut",
                        delay: i * STAGGER_STEP,
                      }}
                      className="relative h-full w-full overflow-hidden rounded-sm shadow-md"
                    >
                      <Image src={photo.src} alt="" fill sizes={`${Math.round(width)}px`} className="object-cover" />
                    </motion.div>
                  </Link>
                );
              })}
            </div>
          );
        })}
      </div>
    </section>
  );
}
