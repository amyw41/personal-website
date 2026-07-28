"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, type PanInfo } from "framer-motion";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import { WHATS_INSIDE_ITEMS } from "@/lib/items";
import { NEIGHBOR_SCALE, computeLayout, useIsSm } from "./layout";

const ITEM_COUNT = WHATS_INSIDE_ITEMS.length;
const ARROW_BUTTON_CLASS =
  "flex h-[2.25rem] w-[2.25rem] flex-shrink-0 items-center justify-center rounded-full border border-black/50 bg-white text-black/50 transition-colors hover:border-[#2460A4] hover:text-[#2460A4]";

export default function Carousel() {
  const [index, setIndex] = useState(0);
  const isSm = useIsSm();
  const { spacing, containerWidth, gap } = computeLayout(isSm);

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

  const handleDragEnd = (_event: unknown, info: PanInfo) => {
    const threshold = spacing / 3;
    if (info.offset.x < -threshold) goTo(index + 1);
    else if (info.offset.x > threshold) goTo(index - 1);
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
          className="relative h-[28rem] flex-shrink-0 overflow-hidden sm:h-[32rem]"
          style={{
            width: containerWidth,
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
          {/* Drag/swipe target: constrained to x:0 so it always springs back to
              center on release — handleDragEnd reads the drag offset to decide
              whether the release should advance the index instead. Keyed on
              the breakpoint so the one-time isSm correction (false -> real
              value, see useIsSm) remounts this fresh instead of animating a
              spring transition between the two spacings — without the key,
              Framer Motion sees that as a prop change on an already-mounted
              tree and springs the items from clustered-near-center out to
              their real positions, which read as an unwanted "pop" on every
              mount. */}
          <motion.div
            key={isSm ? "sm" : "base"}
            className="absolute inset-0 cursor-grab touch-pan-y active:cursor-grabbing"
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.6}
            onDragEnd={handleDragEnd}
          >
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
                  aria-label={`Show ${item.name}`}
                  aria-hidden={dist > 1}
                  tabIndex={dist > 1 ? -1 : 0}
                  initial={false}
                  animate={{ x: offset * spacing, scale }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  style={{ zIndex: 10 - dist, pointerEvents: dist > 1 ? "none" : "auto" }}
                  className="absolute left-1/2 top-1/2 flex h-[360px] w-[360px] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-4 sm:h-[440px] sm:w-[440px] sm:gap-6"
                >
                  {/* Matches Gallery's image box exactly (h-64/72) so an item
                      reads as the same size in both views. */}
                  <motion.div
                    animate={{ opacity: imageOpacity }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="relative h-64 w-64 sm:h-72 sm:w-72"
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

                  <motion.p
                    animate={{ opacity: textOpacity }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className={`max-w-[270px] text-center font-roboto font-light text-gray-500 ${isCenter ? "text-[14px]" : "text-[22px]"}`}
                  >
                    {item.description}
                  </motion.p>
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
