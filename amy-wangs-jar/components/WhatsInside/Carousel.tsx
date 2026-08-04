"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import { WHATS_INSIDE_ITEMS } from "@/lib/items";
import { NEIGHBOR_SCALE, computeLayout, useViewportWidth } from "./layout";

const ITEM_COUNT = WHATS_INSIDE_ITEMS.length;
const ARROW_BUTTON_CLASS =
  "flex h-[2.25rem] w-[2.25rem] flex-shrink-0 items-center justify-center rounded-full border border-black/50 bg-white text-black/50 transition-colors hover:border-[#2460A4] hover:text-[#2460A4]";
// Ratio of the original desktop design (track height 448px at itemSize 360px)
// — kept constant so the track always has enough headroom for the center
// item's 1.3x hover/active scale without clipping it against overflow-hidden.
const TRACK_HEIGHT_RATIO = 448 / 360;

export default function Carousel() {
  const [index, setIndex] = useState(0);
  const viewportWidth = useViewportWidth();
  const { itemSize, imageSize, spacing, containerWidth, gap } = computeLayout(viewportWidth);
  const trackHeight = itemSize * TRACK_HEIGHT_RATIO;

  // Wraps so the carousel loops infinitely: index -1 becomes the last item,
  // index ITEM_COUNT becomes the first.
  const goTo = (i: number) => setIndex(((i % ITEM_COUNT) + ITEM_COUNT) % ITEM_COUNT);

  // Shortest signed distance from `index` to `i` around the loop, e.g. with 9
  // items, the item right after the last one is offset +1 from it (not -8) so
  // it slides in from the correct side instead of snapping across the screen.
  const wrappedOffset = (i: number) => {
    let diff = ((i - index) % ITEM_COUNT + ITEM_COUNT) % ITEM_COUNT;
    if (diff > ITEM_COUNT / 2) diff -= ITEM_COUNT;
    return diff;
  };

  return (
    <div>
      {/* Arrows are laid out as flex siblings of the item track, not
          absolutely positioned over it, so they always sit clear of the
          items. The flex gap here matches the gap baked into `spacing` below,
          so every gutter (arrow-neighbor, neighbor-center, ...) is equal. */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="mx-auto flex items-center justify-center"
        style={{ gap }}
      >
        <button
          type="button"
          onClick={() => goTo(index - 1)}
          aria-label="Previous item"
          className={ARROW_BUTTON_CLASS}
        >
          <ChevronLeft size={23} strokeWidth={1.25} />
        </button>

        <div
          className="relative flex-shrink-0 overflow-hidden"
          style={{
            width: containerWidth,
            height: trackHeight,
            // Fades items out toward the container's own edges instead of
            // hard-clipping them there — the overflow-hidden crop was
            // otherwise producing a visible straight edge as items slid
            // past it.
            WebkitMaskImage:
              "linear-gradient(to right, transparent, black 12%, black 88%, transparent)",
            maskImage:
              "linear-gradient(to right, transparent, black 12%, black 88%, transparent)",
          }}
        >
          {/* Keyed so the one-time correction from the unmeasured
              (viewportWidth===0) default to the real viewport width remounts
              this fresh instead of animating a spring transition between the
              two — without the key, Framer Motion sees that as a prop change
              on an already-mounted tree and springs the items from
              clustered-near-center out to their real positions, which read
              as an unwanted "pop" on first paint. Later resizes
              (viewportWidth already nonzero either way) don't remount, so
              they animate smoothly instead of popping. */}
          <motion.div key={viewportWidth === 0 ? "measuring" : "ready"} className="absolute inset-0">
            {WHATS_INSIDE_ITEMS.map((item, i) => {
              const offset = wrappedOffset(i);
              const dist = Math.abs(offset);
              const isCenter = dist === 0;
              // The centered item renders visually larger than its neighbors
              // by scaling the whole slot (including the image inside it) up
              // beyond its normal 1:1 size, rather than just avoiding the
              // neighbor shrink — a more dramatic "featured item" emphasis.
              const scale = isCenter ? 1.3 : dist === 1 ? NEIGHBOR_SCALE : 0.55;
              // Image dimming stays as before (fully hidden past the immediate
              // neighbors); subtext gets its own, slightly different scheme —
              // always visible at 50% once it's not the main item — so it's
              // driven by a separate opacity value instead of reusing `image`.
              const imageOpacity = isCenter ? 1 : dist === 1 ? 0.55 : 0;
              const textOpacity = isCenter ? 1 : dist === 1 ? 0.5 : 0;

              return (
                <motion.button
                  type="button"
                  key={item.id}
                  onClick={() => goTo(i)}
                  aria-label={`Go to ${item.name}`}
                  aria-hidden={dist > 1}
                  tabIndex={dist > 1 ? -1 : 0}
                  initial={false}
                  animate={{ x: offset * spacing, scale }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  style={{
                    zIndex: 10 - dist,
                    width: itemSize,
                    height: itemSize,
                    gap: itemSize * (16 / 360),
                  }}
                  className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 select-none flex-col items-center justify-center cursor-pointer"
                >
                  {/* Matches Gallery's image box exactly at desktop size (see
                      IMAGE_RATIO in layout.ts) so an item reads as the same
                      size in both views there; below that it scales down with
                      the rest of the carousel to stay on-screen. */}
                  <motion.div
                    animate={{ opacity: imageOpacity }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="relative"
                    style={{ width: imageSize, height: imageSize }}
                  >
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      sizes="(min-width: 640px) 288px, 256px"
                      draggable={false}
                      className="pointer-events-none select-none object-contain"
                    />
                    {isCenter && (
                      <div className="absolute right-2 top-2 flex h-[1.875rem] w-[1.875rem] items-center justify-center rounded-full bg-[#2460A4] text-white">
                        <Star size={15} strokeWidth={2.5} fill="currentColor" />
                      </div>
                    )}
                  </motion.div>

                  {/* span, not p — this now lives inside a <button>, and a
                      <p> isn't valid phrasing content there. */}
                  <motion.span
                    // `scale` here (a plain CSS transform, layered on top of the
                    // button's own scale) is what makes the centered item's text
                    // read a bit smaller than a flat 1.3x — unlike fontSize, a
                    // transform is applied after layout, so it can't change how
                    // the text wraps. fontSize/maxWidth below stay fixed across
                    // focus states for that same reason: the line count a given
                    // description wraps to never changes, so the box's footprint
                    // is identical whether an item is focused or not, and any
                    // overflow is trimmed by the ellipsis instead of resizing it.
                    animate={{ opacity: textOpacity, scale: isCenter ? 0.75 : 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    style={{
                      maxWidth: itemSize * (270 / 360),
                      fontSize: itemSize * (16 / 360),
                    }}
                    className="line-clamp-2 block text-center font-roboto font-light text-gray-500"
                  >
                    {item.description}
                  </motion.span>
                </motion.button>
              );
            })}
          </motion.div>
        </div>

        <button
          type="button"
          onClick={() => goTo(index + 1)}
          aria-label="Next item"
          className={ARROW_BUTTON_CLASS}
        >
          <ChevronRight size={23} strokeWidth={1.25} />
        </button>
      </motion.div>

      <div className="mt-20 flex items-center justify-center gap-3">
        {WHATS_INSIDE_ITEMS.map((item, i) => (
          <button
            key={item.id}
            type="button"
            onClick={() => goTo(i)}
            aria-label={`Go to ${item.name}`}
            className={`rounded-full border transition-all ${i === index
              ? "h-[1.125rem] w-[1.125rem] border-[#2460A4] bg-[#2460A4]"
              : "h-[0.9375rem] w-[0.9375rem] border-black/50 bg-transparent hover:border-[#2460A4]"
              }`}
          />
        ))}
      </div>
    </div>
  );
}
