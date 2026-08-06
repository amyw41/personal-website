"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { motion, useAnimation } from "framer-motion";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import { WHATS_INSIDE_ITEMS } from "@/lib/items";
import { NEIGHBOR_SCALE, computeLayout, useViewportWidth } from "./layout";

// Purely a fun easter egg — clicking it has no effect beyond the animation
// itself. Hover expands the whole badge; click makes just the star icon (not
// the circle behind it) hop up and spin, so it reads as "jumping out of the
// circle" rather than the badge itself moving. `stopPropagation` keeps the
// click from also bubbling up to the carousel item underneath it.
function StarBadge() {
  const starControls = useAnimation();
  // Separate from starControls (which only ever animates the icon inside) —
  // this owns the button's own scale so "big while spinning" is guaranteed
  // regardless of hover state (e.g. on touch, where there's no hover at all
  // to fall back on) instead of depending on whileHover still being active
  // when the tap/click gesture ends.
  const buttonControls = useAnimation();
  const bounce = () => {
    // Grows quickly, holds at the big size for most of the spin, then eases
    // back down right at the end — same 0.7s duration as the icon's own
    // spin below, so the two stay in sync.
    buttonControls.start({
      scale: [1, 1.15, 1.15, 1],
      transition: { duration: 0.7, times: [0, 0.15, 0.85, 1], ease: "easeInOut" },
    });
    starControls.start({
      y: [0, -14, 0],
      // rotateY (spinning around a vertical axis), not a flat rotate
      // (rotateZ) — a flat rotate just spins the icon like a pinwheel in its
      // own plane, with no sense of depth. rotateY actually narrows the icon
      // toward its center as it turns edge-on (at 90/270deg) before
      // widening back out, the same way a spinning person visually narrows
      // as they turn side-on — two full turns reads more like a skater's
      // spin than a single one. transformPerspective (below) is what makes
      // that foreshortening actually visible instead of just stretching.
      rotateY: [0, 720],
      transition: { duration: 0.7, ease: "easeInOut" },
    });
  };

  return (
    <motion.button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        bounce();
      }}
      animate={buttonControls}
      whileHover={{ scale: 1.15 }}
      aria-label="It's a star! (does nothing, just for fun)"
      className="flex h-[1.875rem] w-[1.875rem] items-center justify-center rounded-full bg-[#2460A4] text-white"
    >
      <motion.span
        animate={starControls}
        style={{ transformPerspective: 200 }}
        className="flex items-center justify-center"
      >
        <Star size={15} strokeWidth={2.5} fill="currentColor" />
      </motion.span>
    </motion.button>
  );
}

const ITEM_COUNT = WHATS_INSIDE_ITEMS.length;
const ARROW_BUTTON_CLASS =
  "flex h-[2.25rem] w-[2.25rem] flex-shrink-0 items-center justify-center rounded-full border border-black/50 bg-white text-black/50 transition-colors hover:border-[#2460A4] hover:text-[#2460A4]";
// Ratio of the original desktop design (track height 448px at itemSize 360px)
// — kept constant so the track always has enough headroom for the center
// item's 1.3x hover/active scale without clipping it against overflow-hidden.
const TRACK_HEIGHT_RATIO = 448 / 360;
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

export default function Carousel() {
  const [index, setIndex] = useState(0);
  const viewportWidth = useViewportWidth();
  const { itemSize, imageSize, spacing, containerWidth, gap } = computeLayout(viewportWidth, CAROUSEL_MAX_ITEM_SIZE);
  const trackHeight = itemSize * TRACK_HEIGHT_RATIO;

  // Wraps so the carousel loops infinitely: index -1 becomes the last item,
  // index ITEM_COUNT becomes the first.
  const goTo = (i: number) => setIndex(((i % ITEM_COUNT) + ITEM_COUNT) % ITEM_COUNT);

  // How far (and which way) the new center item just came from — the
  // shortest signed wrapped distance from the previous index to this one.
  // Computed directly during render (not an effect) so it's ready on the
  // very same render the index changes, with no extra render pass/flash.
  // The star wrapper below uses this as its own entrance offset, springing
  // in from that direction to 0 — the same distance the incoming item
  // itself travels — so the badge visibly "arrives with" whichever item
  // just became centered instead of sitting static at dead center through
  // every transition.
  const prevIndexRef = useRef(index);
  let starDirection = 0;
  if (prevIndexRef.current !== index) {
    let diff = ((index - prevIndexRef.current) % ITEM_COUNT + ITEM_COUNT) % ITEM_COUNT;
    if (diff > ITEM_COUNT / 2) diff -= ITEM_COUNT;
    starDirection = diff;
    prevIndexRef.current = index;
  }

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
                      sizes="(min-width: 640px) 230px, 205px"
                      draggable={false}
                      className="pointer-events-none select-none object-contain"
                    />
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

        {/* Rendered as a sibling of the track, outside its overflow-hidden +
            edge-fade mask — nested inside the track (its old spot), the
            badge's own hover/click growth and the star's jump could poke
            past the track's clip bounds and get visibly cut off. The
            centered item always sits at this exact spot (dead center, at
            CENTER_SCALE) regardless of which item it is, so one fixed
            overlay covers every case without needing to track a moving
            per-item position. pointer-events-none on the outer sizing
            wrapper keeps it from blocking clicks on the item underneath;
            pointer-events-auto on the inner one re-enables just the badge.
            key={index} + initial/animate is what makes it arrive *with* the
            incoming item (see starDirection's own comment) instead of
            sitting static through every transition — each index change
            remounts it fresh, springing in from the same distance/direction
            the new center item itself just traveled. */}
        <motion.div
          key={index}
          initial={{ x: starDirection * spacing }}
          animate={{ x: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{ width: itemSize * CENTER_SCALE, height: itemSize * CENTER_SCALE }}
        >
          <div className="pointer-events-auto absolute right-2 top-2">
            <StarBadge />
          </div>
        </motion.div>
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
