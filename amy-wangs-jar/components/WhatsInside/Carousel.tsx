"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, type PanInfo } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { WHATS_INSIDE_ITEMS } from "@/lib/items";
import { NEIGHBOR_SCALE, computeLayout, useIsSm } from "./layout";

const ITEM_COUNT = WHATS_INSIDE_ITEMS.length;
const ARROW_BUTTON_CLASS =
  "flex h-[2.625rem] w-[2.625rem] flex-shrink-0 items-center justify-center rounded-full border border-black bg-white text-black transition-colors hover:border-[#2460A4] hover:text-[#2460A4]";

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

  const active = WHATS_INSIDE_ITEMS[index];

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
          <ChevronLeft size={27} strokeWidth={1.25} />
        </button>

        <div
          className="relative h-[28rem] flex-shrink-0 overflow-hidden sm:h-[32rem]"
          style={{ width: containerWidth }}
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
              const opacity = isCenter ? 1 : dist === 1 ? 0.55 : 0;

              return (
                <motion.button
                  type="button"
                  key={item.id}
                  onClick={() => goTo(i)}
                  aria-label={`Show ${item.name}`}
                  initial={false}
                  animate={{ x: offset * spacing, scale, opacity }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  style={{ zIndex: 10 - dist, pointerEvents: dist > 1 ? "none" : "auto" }}
                  className="absolute left-1/2 top-1/2 flex h-[387px] w-[387px] -translate-x-1/2 -translate-y-1/2 items-center justify-center sm:h-[469px] sm:w-[469px]"
                >
                  {/* Matches Gallery's image box exactly (h-64/72) so an item
                      reads as the same size in both views. */}
                  <div className="relative h-64 w-64 sm:h-72 sm:w-72">
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      sizes="(min-width: 640px) 288px, 256px"
                      draggable={false}
                      className="pointer-events-none select-none object-contain"
                    />
                  </div>
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
          <ChevronRight size={27} strokeWidth={1.25} />
        </button>
      </motion.div>

      <motion.div
        key={active.id}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="mx-auto mt-3 flex min-h-[4.5rem] max-w-[16rem] items-center justify-center text-center"
      >
        <p className="font-roboto text-base text-gray-500">{active.description}</p>
      </motion.div>

      <div className="mt-12 flex items-center justify-center gap-3">
        {WHATS_INSIDE_ITEMS.map((item, i) => (
          <button
            key={item.id}
            type="button"
            onClick={() => goTo(i)}
            aria-label={`Go to ${item.name}`}
            className={`h-[0.9375rem] w-[0.9375rem] rounded-full border transition-colors ${
              i === index
                ? "border-[#2460A4] bg-[#2460A4]"
                : "border-black bg-transparent hover:border-[#2460A4]"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
