"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { WHATS_INSIDE_ITEMS } from "@/lib/items";
import { NEIGHBOR_SCALE, computeLayout, useViewportWidth } from "./layout";
import StarBadge from "./StarBadge";

const ITEM_COUNT = WHATS_INSIDE_ITEMS.length;
const ARROW_BUTTON_CLASS =
  "flex h-[2.25rem] w-[2.25rem] flex-shrink-0 items-center justify-center rounded-full border border-black/50 bg-white text-black/50 transition-colors hover:border-[#2460A4] hover:text-[#2460A4]";
// Ratio of the original desktop design (track height 448px at itemSize 360px)
// — kept constant so the track always has enough headroom for the center
// item's 1.3x hover/active scale without clipping it against overflow-hidden.
const TRACK_HEIGHT_RATIO = 448 / 360;
// Extra headroom on top of the ratio above, sized to fit the star badge's
// own hover-grow/click-bounce and its icon's upward jump-spin — fixed px,
// not scaled by itemSize, since the badge itself is a fixed rem size
// regardless of viewport. Lets the badge stay nested inside the centered
// item's own box (see its placement below) instead of needing to live
// outside the track as a separate element synced to match — nested, it
// naturally travels with whichever item is centered during a transition,
// for free, since it's part of that item's own animated box.
const STAR_HEADROOM_PX = 48;
// Caps this carousel's own item size at 0.8x the shared MAX_ITEM_SIZE
// (layout.ts's own 440px design ceiling) — passed as computeLayout's own
// second argument rather than changing MAX_ITEM_SIZE itself, since that
// constant is also used by the /etc page's carefully-tuned composition.
// Below this ceiling (narrower viewports), computeLayout's own width-solve
// still applies exactly as before — this only ever caps the top end.
const CAROUSEL_MAX_ITEM_SIZE = 352;
// Named (not just a literal 1.3 in the scale calculation below) since the
// star badge's own positioning wrapper needs this exact same number to
// overlay the centered item correctly — see its own comment.
const CENTER_SCALE = 1.3;
const FAR_SCALE = 0.55;

export default function Carousel({
  litItems,
  onToggleLit,
}: {
  litItems: Set<string>;
  onToggleLit: (id: string) => void;
}) {
  const [index, setIndex] = useState(0);
  const viewportWidth = useViewportWidth();
  const { itemSize, imageSize, spacing, containerWidth, gap } = computeLayout(viewportWidth, CAROUSEL_MAX_ITEM_SIZE);
  const trackHeight = itemSize * TRACK_HEIGHT_RATIO + STAR_HEADROOM_PX;

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
        className="relative mx-auto flex items-center justify-center"
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
              const scale = isCenter ? CENTER_SCALE : dist === 1 ? NEIGHBOR_SCALE : FAR_SCALE;
              // Image dimming stays as before (fully hidden past the immediate
              // neighbors); subtext gets its own, slightly different scheme —
              // always visible at 50% once it's not the main item — so it's
              // driven by a separate opacity value instead of reusing `image`.
              const imageOpacity = isCenter ? 1 : dist === 1 ? 0.55 : 0;
              const textOpacity = isCenter ? 1 : dist === 1 ? 0.5 : 0;

              return (
                // div with role="button", not an actual <button> — this item
                // wraps the StarBadge (also a real <button>) when centered,
                // and HTML doesn't allow a <button> inside a <button> (React
                // will still mount it, but hydration fails since the browser
                // itself splits the nested <button> out during initial HTML
                // parsing, producing a different tree than React rendered).
                // role="button" + onClick + onKeyDown reproduces native
                // button semantics (click + Enter/Space activation, tab
                // stop) without that restriction.
                <motion.div
                  role="button"
                  key={item.id}
                  onClick={() => goTo(i)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      goTo(i);
                    }
                  }}
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
                      sizes="(min-width: 640px) 230px, 205px"
                      draggable={false}
                      className="pointer-events-none select-none object-contain"
                    />
                  </motion.div>

                  {/* Anchored to the outer itemSize box (bigger than the
                      imageSize box above, by design — see IMAGE_RATIO), not
                      to the image itself — sitting in that existing margin
                      instead of pinned tight against the artwork's own edge
                      is what keeps it reading consistently across items,
                      whatever each product photo's own shape happens to be
                      (same idea Gallery's badge uses, anchored to its outer
                      card rather than its image box). Nested here (inside
                      the item's own animated box) rather than as a separate
                      overlay is what lets it travel with the item for free
                      during slide transitions — STAR_HEADROOM_PX above is
                      what keeps its own hover/click growth from clipping
                      against the track's overflow-hidden from this spot. */}
                  {isCenter && (
                    <div className="absolute right-2 top-2">
                      <StarBadge
                        size={30}
                        iconSize={15}
                        lit={litItems.has(item.id)}
                        onToggle={() => onToggleLit(item.id)}
                      />
                    </div>
                  )}

                  {/* span, not p — kept as inline phrasing content to match
                      the StarBadge/image siblings above. */}
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
                </motion.div>
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
