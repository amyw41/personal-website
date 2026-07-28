"use client";

import { useEffect, useState } from "react";
import { notFound, useParams } from "next/navigation";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import PlateCircle from "@/components/Etc/PlateCircle";
import { useViewportWidth } from "@/components/WhatsInside/layout";
import { ETC_CATEGORIES, ETC_PHOTOS } from "@/lib/etc";

const REPEL_DEG = 7; // how far a neighbor shifts away from the hovered photo
const MAX_ROTATE = 16; // deg, the outermost photos' tilt (fans in toward 0 at center)
const HOVER_SCALE = 1.3;
const PAGE_PADDING = 32; // matches this section's own px-4 on each side

// Desktop reference values — the old two fixed presets (a "base" and "sm"
// tier) still left the base tier's own total width (radius*2+box = 434px)
// wider than a 320-375px phone. Scaling every dimension by measured
// available width / this reference's own total width guarantees the arc
// never exceeds the viewport, at any width, instead of just at the two
// sizes the presets happened to cover.
const REFERENCE = { circle: 440, radius: 300, box: 140 };
const REFERENCE_WIDTH = REFERENCE.radius * 2 + REFERENCE.box;

// Plain helper, not a hook (no React state/effects) — safe to call after an
// early return. Positions run along the top half of a circle: t=0 is 9
// o'clock, t=0.5 is 12 o'clock, t=1 is 3 o'clock. When something else in the
// arc is hovered, non-hovered photos get pushed further along the arc away
// from it, with the push falling off by distance.
function getArcPositions(count: number, hoveredIndex: number | null, radius: number) {
  return Array.from({ length: count }, (_, i) => {
    const t = count === 1 ? 0.5 : i / (count - 1);
    let angleDeg = 180 - t * 180;
    if (hoveredIndex !== null && i !== hoveredIndex) {
      const diff = i - hoveredIndex;
      angleDeg += (REPEL_DEG / Math.abs(diff)) * Math.sign(diff);
    }
    const angle = (angleDeg * Math.PI) / 180;
    return {
      x: Math.cos(angle) * radius,
      y: -Math.sin(angle) * radius,
      rotate: (t - 0.5) * MAX_ROTATE * 2,
    };
  });
}

export default function EtcCategoryPage() {
  const params = useParams<{ category: string }>();
  const category = ETC_CATEGORIES.find((c) => c.slug === params.category);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const viewportWidth = useViewportWidth();

  useEffect(() => {
    if (selectedIndex === null) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedIndex(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedIndex]);

  if (!category) notFound();

  const photos = ETC_PHOTOS[category.slug];
  const available = Math.max(viewportWidth - PAGE_PADDING, 220);
  const scale = viewportWidth === 0 ? 1 : Math.min(available / REFERENCE_WIDTH, 1);
  const circle = REFERENCE.circle * scale;
  const radius = REFERENCE.radius * scale;
  const box = REFERENCE.box * scale;
  const positions = getArcPositions(photos.length, hoveredIndex, radius);
  const selected = selectedIndex !== null ? photos[selectedIndex] : null;

  return (
    <section className="relative mx-auto flex w-full max-w-5xl flex-col items-center px-4 pb-40 pt-16 text-center">
      <motion.h1
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="font-singsong text-[clamp(2rem,6vw,3.5rem)] leading-none text-[#2460A4]"
      >
        {category.label}
      </motion.h1>

      <div className="relative mt-28" style={{ width: radius * 2 + box, height: radius + circle / 2 + box }}>
        <PlateCircle
          label={category.label}
          size={circle}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        />

        {photos.map((photo, i) => {
          const pos = positions[i];
          const isHovered = hoveredIndex === i;
          return (
            <motion.button
              type="button"
              key={photo.src}
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
              onFocus={() => setHoveredIndex(i)}
              onBlur={() => setHoveredIndex(null)}
              onClick={() => setSelectedIndex(i)}
              aria-label={`Open photo: ${photo.caption}`}
              className="absolute left-1/2 top-1/2"
              style={{
                width: box,
                height: box,
                x: pos.x - box / 2,
                y: pos.y - box / 2,
                rotate: pos.rotate,
                zIndex: isHovered ? 30 : i,
              }}
              animate={{ scale: isHovered ? HOVER_SCALE : 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 24 }}
            >
              <div className="relative h-full w-full overflow-hidden rounded-sm shadow-lg">
                <Image
                  src={photo.src}
                  alt={photo.caption}
                  fill
                  sizes={`${Math.round(box)}px`}
                  className="object-cover transition-[filter] duration-300"
                  style={{ filter: isHovered ? "grayscale(0) saturate(1.1)" : "grayscale(0.85) saturate(0.6)" }}
                />
              </div>
              <AnimatePresence>
                {isHovered && (
                  <motion.span
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="pointer-events-none absolute left-1/2 top-full mt-2 w-36 -translate-x-1/2 whitespace-normal text-center font-roboto text-xs text-gray-600"
                  >
                    {photo.caption}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-6"
            onClick={() => setSelectedIndex(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
              className="relative flex max-h-[85vh] w-[min(90vw,560px)] flex-col overflow-hidden rounded-lg bg-white shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setSelectedIndex(null)}
                aria-label="Close"
                className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-gray-700 shadow transition-colors hover:text-[#2460A4]"
              >
                <X size={18} />
              </button>
              <div className="relative h-[60vh] w-full">
                <Image src={selected.src} alt={selected.caption} fill className="object-contain" sizes="560px" />
              </div>
              <p className="px-6 py-4 font-roboto text-sm text-gray-600">{selected.caption}</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
