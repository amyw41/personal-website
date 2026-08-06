"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { notFound, useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ChevronLeft, ChevronRight, X } from "lucide-react";
import PlateCircle from "@/components/Etc/PlateCircle";
import { ARROW_SIZE, MAX_ITEM_SIZE, NEIGHBOR_SCALE, deriveLayout, useElementSize } from "@/components/WhatsInside/layout";
import { ETC_CATEGORIES, ETC_PHOTOS } from "@/lib/etc";

// Matches Carousel.tsx's own arrow styling exactly — fixed size (not scaled
// to viewport the way the rest of this page used to be), same as the home
// page carousel.
const ARROW_BUTTON_CLASS =
  "flex h-[2.25rem] w-[2.25rem] flex-shrink-0 items-center justify-center rounded-full border border-black/50 bg-white text-black/50 transition-colors hover:border-[#2460A4] hover:text-[#2460A4]";

const CENTER_SCALE = 1.1; // smaller than Carousel.tsx's own 1.3 — the featured photo here was reading too large
const FAR_SCALE = 0.55; // matches Carousel.tsx's own dist>=2 scale

// The plate's diameter relative to itemSize (deriveLayout's own uniform
// item size — the same formulas the home page carousel uses, just driven
// from a frozen design constant here instead of a re-solved viewport width).
const PLATE_SCALE = 2.5;
// How much of the plate image is actually visible, as a fraction of its own
// diameter — entirely independent of the plate's radius. (The previous
// BLEED_FRACTION formula pinned the crop window's top to the plate's own
// center — "top: -plateRadius" — so it always showed at least half the
// image no matter how it was tuned; the "thin sliver" look before was
// actually the section's overflow-hidden accidentally chopping the rest off
// on top of that, not this fraction doing its job. Now that the section
// never needs to clip anything, this is what actually controls it — tune
// this directly to get the sliver back.) The crop window always starts from
// the image's own top edge (its clean edge post-rotation — see
// PlateCircle's own comment), so this is "how far down from the top of the
// image is visible," not a fraction measured from the plate's center.
const PLATE_VISIBLE_RATIO = 0.15;
// Fraction of itemSize left as breathing room between the item ring and the
// plate's own rim — smaller than before so the plate's visible top sits
// higher, closer under the photo row instead of leaving a big empty gap.
const PLATE_ITEM_GAP_RATIO = -0.12;

// Ceiling on how large the whole composition (scaled up from its fixed
// design size — see the scale calc in the component below) is ever allowed
// to render, so an ultrawide or very tall monitor doesn't blow it up to
// something comically oversized just because the space is there.
const MAX_SCALE = 1.5;

// Position + rotation for a slot `offsetDeg` degrees around from center (0 =
// dead center/top, positive = right, negative = left) at the given radius.
function getArcSlot(offsetDeg: number, radius: number) {
  const angleDeg = 90 - offsetDeg;
  const angle = (angleDeg * Math.PI) / 180;
  return {
    x: Math.cos(angle) * radius,
    y: -Math.sin(angle) * radius,
    rotate: offsetDeg,
  };
}

export default function EtcCategoryPage() {
  const router = useRouter();
  const params = useParams<{ category: string }>();
  const category = ETC_CATEGORIES.find((c) => c.slug === params.category);
  // Next.js unmounts this page the instant a Link navigation fires, with no
  // chance to play an exit animation — so the back button instead flips this
  // flag, lets the content fade+slide back down (the entrance in reverse),
  // and only navigates once that animation actually finishes.
  const [isExiting, setIsExiting] = useState(false);
  // Unwrapped step count (can grow past ±photoCount across many clicks) —
  // not the wrapped photo index. The whole row rotates by exactly one
  // angleStep per step change (see the wheel motion.div below), so this one
  // value driving a single spring is what makes the whole belt move as one
  // rigid unit instead of every item re-targeting its own position
  // independently. `index` (the actual centered photo) is just step mod
  // photoCount, derived below once photoCount is known.
  const [step, setStep] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  // Frozen at the design constant, not re-solved per viewport. The whole
  // composition — item spacing, arrow position, plate size, and the
  // plate's own crop line — is designed once at this one fixed size, then
  // scaled as a single unit to fit whatever space is actually available
  // (see `scale` below). That's what keeps every one of those pieces in
  // sync with every other one: nothing here can independently drift out of
  // proportion with anything else the way separately-tuned per-viewport
  // formulas (this page's old approach) eventually did.
  const { itemSize, imageSize, spacing, gap } = deriveLayout(MAX_ITEM_SIZE);
  // Measures the actual box this composition needs to fit into — the
  // flex-1 area below the title (see the render below), not the raw
  // viewport, so the header's height and the section's own padding are
  // automatically netted out by ordinary CSS layout instead of a
  // hand-subtracted pixel budget.
  const [areaBoxRef, availableSize] = useElementSize<HTMLDivElement>();

  // When photoCount is even, the photo exactly opposite center can't split
  // evenly between the two sides — the tie always resolves to the right, so
  // every step forces exactly one photo to jump straight from "visible on
  // the left" to "invisible on the right" (or back). Animating x/y for a
  // jump like that directly would sweep the photo across the plate in a
  // straight line instead of riding the arc, so jumps snap position instantly
  // (see the per-item transition below) and let opacity carry the fade.
  const lastStepRef = useRef(-1);
  const prevOffsetsRef = useRef<Map<number, number>>(new Map());
  const workingOffsetsRef = useRef<Map<number, number>>(new Map());

  useEffect(() => {
    setStep(0);
    lastStepRef.current = -1;
    prevOffsetsRef.current = new Map();
    workingOffsetsRef.current = new Map();
  }, [category?.slug]);

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
  const photoCount = photos.length;
  const index = photoCount === 0 ? 0 : ((step % photoCount) + photoCount) % photoCount;

  // Advances by exactly one wheel step (±1) — every navigation action
  // (arrows, clicking a neighbor, drag release) is a single step, so this is
  // the only thing that ever changes `step`. Never wraps: letting it grow
  // unbounded is what lets the wheel's own rotation (see angleStepDeg below)
  // keep spinning smoothly through a loop boundary instead of snapping back.
  const advance = (delta: number) => setStep((s) => s + delta);

  if (lastStepRef.current !== step) {
    prevOffsetsRef.current = workingOffsetsRef.current;
    workingOffsetsRef.current = new Map();
    lastStepRef.current = step;
  }

  const wrappedOffset = (i: number) => {
    const raw = (((i - index) % photoCount) + photoCount) % photoCount;
    let diff: number;
    if (raw > photoCount / 2) {
      diff = raw - photoCount;
    } else if (raw < photoCount / 2) {
      diff = raw;
    } else {
      // Exact halfway tie (only possible when photoCount is even) — e.g. with
      // 4 photos, the one diametrically opposite center is equally "left" or
      // "right". Always picking the same side here (as this used to) makes
      // one arrow direction discontinuous: a visible neighbor advancing past
      // this point gets relabeled onto the *other* side mid-flight, which
      // trips the jump-freeze fallback below and reads as a snap/slide-back.
      // Continuing whichever way this photo was already heading keeps every
      // step a uniform ±1 offset change, so both directions animate the same.
      const prevOffset = prevOffsetsRef.current.get(i);
      diff = prevOffset !== undefined && prevOffset < 0 ? raw - photoCount : raw;
    }
    workingOffsetsRef.current.set(i, diff);
    return diff;
  };

  // The radius the whole row curves around — tied to the plate's own size,
  // so items ride close around its rim.
  const plateSize = itemSize * PLATE_SCALE;
  const plateRadius = plateSize / 2;
  const attachRadius = plateRadius + itemSize * (0.5 + PLATE_ITEM_GAP_RATIO);
  // See PLATE_VISIBLE_RATIO's own comment — the actual crop height, small and
  // independent of plateRadius.
  const plateVisibleHeight = plateSize * PLATE_VISIBLE_RATIO;
  // The crop window's own top stays pinned plateRadius above the hub —
  // unchanged from the very first working version of this page — so the
  // visible sliver stays immediately adjacent to the photo ring exactly like
  // it always did. Only its height shrank (above), so its bottom edge now
  // usually lands *above* the hub, not below it — this is how far below the
  // hub the composition's own lowest visible pixel actually sits, which is
  // normally negative (nothing visible reaches down to the hub at all; the
  // hub past that point is just an invisible math reference the photo ring
  // is built from, not a pixel that needs to be included in the box).
  const plateBottomBelowHub = plateVisibleHeight - plateRadius;

  // Converts a *linear* distance — exactly what Carousel.tsx would use for
  // its flat `x: offset*spacing` — into the angle needed to cover that same
  // arc-length at attachRadius. This is the one real difference from the
  // home page carousel: everything else (spacing, sizing, opacity, scale) is
  // identical, just wrapped onto a curve instead of a straight line.
  const degFor = (linear: number) => (linear / attachRadius) * (180 / Math.PI);
  // The wheel's own per-step rotation — degFor(offset*spacing) for any
  // integer offset is just offset*degFor(spacing) (degFor is linear), so
  // this is the same per-item angle as before, just factored out to also
  // drive the wheel's rotation below.
  const angleStepDeg = degFor(spacing);
  const neighborSize = itemSize * NEIGHBOR_SCALE;
  const arrowLinearOffset = spacing + neighborSize / 2 + gap + ARROW_SIZE / 2;
  const arrowDeg = degFor(arrowLinearOffset);
  const leftArrowSlot = getArcSlot(-arrowDeg, attachRadius);
  const rightArrowSlot = getArcSlot(arrowDeg, attachRadius);

  // Container sizing: wide/tall enough to hold the plate + the full curved
  // row, arrows included, without clipping.
  const topReach = attachRadius + (itemSize * CENTER_SCALE) / 2 + 12;
  // Usually less than topReach alone, now that plateBottomBelowHub is
  // normally negative — the box only needs to reach down to whichever is
  // actually lowest, the photo ring or the plate sliver, not both stacked.
  const areaHeight = topReach + plateBottomBelowHub;
  const areaWidth = Math.abs(rightArrowSlot.x) * 2 + ARROW_SIZE + 16;

  // The design box for whichever branch is about to render — the plate-only
  // empty state is a different (smaller) natural box than the full
  // photo+arrow arc, so the scale has to be solved against whichever one is
  // actually on screen.
  const designWidth = photoCount === 0 ? plateSize : areaWidth;
  const designHeight = photoCount === 0 ? plateVisibleHeight : areaHeight;
  // The one scale factor the whole composition renders at (applied as a
  // single transform below) — the same technique used to fit an SVG/logo
  // into any container. Deliberately no floor on the small end: letting it
  // shrink to whatever actually fits is what makes "fits by construction" an
  // absolute guarantee instead of a usual case with an escape hatch.
  // availableSize starts at {0,0} before the very first client measurement,
  // which would make this 0 — but useElementSize corrects that
  // synchronously before the browser's first paint (see its own comment),
  // so that never actually renders.
  const scale =
    availableSize.width > 0 && availableSize.height > 0
      ? Math.min(availableSize.width / designWidth, availableSize.height / designHeight, MAX_SCALE)
      : 0;

  const selected = selectedIndex !== null ? photos[selectedIndex] : null;

  return (
    <section
      className="relative mx-auto flex w-full max-w-[96rem] flex-col overflow-hidden px-4 pt-3 text-center"
      style={{
        // Caps this page to exactly one viewport below the sticky header
        // (same --taskbar-height var Jar.js's hero reads). The composition
        // below is scaled (see `scale` above) to fit whatever room that
        // leaves, so nothing here needs to clip it at the fold anymore —
        // this height is just the fixed budget `scale` fits inside of.
        height: "calc(100dvh - var(--taskbar-height, 4.375rem))",
      }}
    >
      <Link
        href="/etc"
        aria-label="Back to What's on my plate"
        className={`absolute left-4 top-3 z-20 ${ARROW_BUTTON_CLASS}`}
        onClick={(e) => {
          e.preventDefault();
          setSelectedIndex(null);
          setIsExiting(true);
        }}
      >
        <ArrowLeft size={20} strokeWidth={1.25} />
      </Link>

      <motion.div
        className="flex min-h-0 flex-1 flex-col"
        initial={{ opacity: 0, y: 40 }}
        // Exit continues the same upward direction the entrance arrived
        // from (fading out on its way further up) instead of reversing back
        // down to the entrance's own starting point.
        animate={{ opacity: isExiting ? 0 : 1, y: isExiting ? -16 : 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        onAnimationComplete={() => {
          if (isExiting) router.push("/etc");
        }}
      >
        <h1 className="font-singsong text-[clamp(2rem,6vw,3.5rem)] leading-none text-[#2460A4]">
          {category.label}
        </h1>

        {photoCount === 0 ? (
          // flex-1: fills whatever vertical room the title left in the
          // section above — its own rendered size (measured by areaBoxRef)
          // is exactly the "available space" `scale` above solves against,
          // with header height and padding already netted out by ordinary
          // CSS layout instead of a hand-subtracted pixel budget.
          <div ref={areaBoxRef} className="relative mt-16 min-h-0 flex-1">
            <div
              className="absolute bottom-0 left-1/2"
              style={{
                width: plateSize,
                height: plateVisibleHeight,
                transform: `translateX(-50%) scale(${scale})`,
                // Anchors the bottom-center point (where the plate sits) in
                // place while the rest of the composition grows/shrinks
                // around it, so scaling never shifts where it visually docks.
                transformOrigin: "bottom center",
              }}
            >
              {/* Sits just above the plate; scales down together with it
                  since it lives inside the same scaled wrapper. */}
              <p className="absolute inset-x-0 -top-6 font-roboto text-sm text-gray-400">Coming soon.</p>
              <div
                className="absolute left-1/2 -translate-x-1/2 overflow-hidden"
                style={{ top: 0, width: plateSize, height: plateVisibleHeight }}
              >
                <PlateCircle label="" size={plateSize} className="absolute left-0 top-0" />
              </div>
            </div>
          </div>
        ) : (
          // Same flex-1-measures-available-space contract as the empty-state
          // branch above.
          <div ref={areaBoxRef} className="relative mt-8 min-h-0 flex-1">
          <div
            className="absolute bottom-0 left-1/2"
            style={{
              width: areaWidth,
              height: areaHeight,
              transform: `translateX(-50%) scale(${scale})`,
              // Anchors the hub (bottom-center of this box) in place while
              // the rest of the composition scales around it — this single
              // transform is the only thing standing between the fixed
              // design box above and whatever space is actually available;
              // everything inside stays in the exact proportions it was
              // designed at, no separate re-solving.
              transformOrigin: "bottom center",
            }}
          >
          {/* Hub: the plate, both arrows, and the item track are all
              positioned relative to this single anchor point, the same way
              the previous arc version worked. */}
          <div className="absolute left-1/2" style={{ bottom: plateBottomBelowHub }}>
            {/* top: -plateRadius, unchanged from the original working
                version — keeps the crop window's top pinned right where the
                photo ring actually is, so the visible sliver reads as
                attached to the photos, not floating apart from them. Only
                the height (plateVisibleHeight, small and independent of
                plateRadius) changed — see PLATE_VISIBLE_RATIO's comment. */}
            <div
              className="absolute left-1/2 -translate-x-1/2 overflow-hidden"
              style={{ top: -plateRadius, width: plateSize, height: plateVisibleHeight }}
            >
              <PlateCircle label="" size={plateSize} className="absolute left-0 top-0" />
            </div>

            {photoCount > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => advance(-1)}
                  aria-label="Previous photo"
                  className={`absolute z-10 ${ARROW_BUTTON_CLASS}`}
                  style={{
                    left: leftArrowSlot.x,
                    top: leftArrowSlot.y,
                    transform: `translate(-50%, -50%) rotate(${leftArrowSlot.rotate}deg)`,
                  }}
                >
                  <ChevronLeft size={23} strokeWidth={1.25} />
                </button>
                <button
                  type="button"
                  onClick={() => advance(1)}
                  aria-label="Next photo"
                  className={`absolute z-10 ${ARROW_BUTTON_CLASS}`}
                  style={{
                    left: rightArrowSlot.x,
                    top: rightArrowSlot.y,
                    transform: `translate(-50%, -50%) rotate(${rightArrowSlot.rotate}deg)`,
                  }}
                >
                  <ChevronRight size={23} strokeWidth={1.25} />
                </button>
              </>
            )}

            {/* Edge-faded exactly like Carousel.tsx (an alpha mask on the
                items themselves, not an opaque overlay) — mask-size/-position
                stretch that same left-right gradient to 3x this box's own
                height, centered, so the center item's spring can briefly
                overshoot past its resting scale without popping invisible at
                the top edge (a plain 100%-tall mask has zero coverage past
                its own box). */}
            <div
              className="absolute left-1/2 -translate-x-1/2 overflow-hidden"
              style={{
                // The wheel inside rotates at rest whenever step !== 0 (see
                // below) — its own untransformed box then sits at an angle,
                // and without clipping here, its rotated corners bleed past
                // this box and widen the page's own scrollable area even
                // though every actual photo still lands well within it.
                top: -topReach,
                width: areaWidth,
                height: topReach,
                WebkitMaskImage: "linear-gradient(to right, transparent, black 12%, black 88%, transparent)",
                maskImage: "linear-gradient(to right, transparent, black 12%, black 88%, transparent)",
                WebkitMaskSize: "100% 300%",
                maskSize: "100% 300%",
                WebkitMaskPosition: "center",
                maskPosition: "center",
                WebkitMaskRepeat: "no-repeat",
                maskRepeat: "no-repeat",
              }}
            >
              {/* The wheel: a single rigid rotation (spring on `rotate`
                  alone) is what makes the whole row move together like
                  Carousel.tsx's belt, instead of every item separately
                  re-targeting its own x/y along the curve (two independent
                  linear springs tracing a straight-ish path between two
                  points on a circle, which don't move in sync with each
                  other the way a uniform rotation does). Pivots from
                  bottom-center (originY:1), the hub point every item is
                  already anchored to below, not the box's own center. */}
              <motion.div
                // No remount-on-measure key needed here (unlike the old
                // viewport-width-solved layout, or Carousel.tsx's own):
                // itemSize is now a frozen constant, identical on the server
                // and every client render, so attachRadius and every item's
                // arc slot never jump after mount — only `scale` (a plain
                // style, not a Framer-animated value) changes once the
                // available space is measured.
                className="absolute inset-0"
                style={{ originX: 0.5, originY: 1 }}
                initial={false}
                animate={{ rotate: -step * angleStepDeg }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              >
                {photos.map((photo, i) => {
                  const offset = wrappedOffset(i);
                  const dist = Math.abs(offset);
                  const isCenter = dist === 0;
                  const imageOpacity = isCenter ? 1 : dist === 1 ? 0.55 : 0;

                  // itemStep stays numerically constant across an ordinary
                  // single-step advance (offset moves opposite to step by
                  // the same amount), so this item's own local slot doesn't
                  // need to re-spring — the wheel's shared rotation above is
                  // what actually carries it to its new on-screen spot. Only
                  // the one photo whose shortest-path offset flips sides
                  // (see the comment above the refs) needs special handling.
                  const prevOffset = prevOffsetsRef.current.get(i);
                  const jumped = prevOffset !== undefined && Math.abs(offset - prevOffset) > 1;
                  // A jump straight from the visible left slot into the
                  // invisible right one would otherwise teleport to its new
                  // (offscreen) spot and only then start fading — an instant
                  // pop rather than a fade. Freezing position at the last
                  // visible slot for just this transition lets it fade out
                  // from where it was actually seen instead. The reverse
                  // (appearing on the left) has no "last seen" spot to freeze
                  // at, so it snaps straight to its real slot and fades in.
                  const exiting = jumped && Math.abs(prevOffset!) <= 1 && dist >= 2;
                  const posOffset = exiting ? prevOffset! : offset;
                  const posDist = Math.abs(posOffset);
                  const itemStep = step + posOffset;
                  const slot = getArcSlot(itemStep * angleStepDeg, attachRadius);
                  const scale = posDist === 0 ? CENTER_SCALE : posDist === 1 ? NEIGHBOR_SCALE : FAR_SCALE;

                  return (
                    <motion.button
                      type="button"
                      key={photo.src}
                      onClick={isCenter ? () => setSelectedIndex(i) : undefined}
                      aria-label={isCenter ? `Open photo: ${photo.caption}` : undefined}
                      aria-hidden={!isCenter}
                      tabIndex={isCenter ? 0 : -1}
                      initial={false}
                      animate={{ x: slot.x, y: slot.y, rotate: slot.rotate, scale }}
                      transition={
                        jumped
                          ? { x: { duration: 0 }, y: { duration: 0 }, rotate: { duration: 0 }, scale: { duration: 0 } }
                          : { type: "spring", stiffness: 300, damping: 30 }
                      }
                      style={{
                        zIndex: 10 - dist,
                        pointerEvents: isCenter ? "auto" : "none",
                        width: itemSize,
                        height: itemSize,
                      }}
                      className="absolute left-1/2 top-full flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center"
                    >
                      <motion.div
                        animate={{ opacity: imageOpacity }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="relative"
                        style={{ width: imageSize, height: imageSize }}
                      >
                        <Image
                          src={photo.src}
                          alt={photo.caption}
                          fill
                          sizes="(min-width: 640px) 288px, 256px"
                          draggable={false}
                          className="pointer-events-none select-none object-contain"
                        />
                      </motion.div>
                    </motion.button>
                  );
                })}
              </motion.div>
            </div>
          </div>
        </div>
        </div>
        )}
      </motion.div>

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
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
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
