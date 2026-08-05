"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { notFound, useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ChevronLeft, ChevronRight, X } from "lucide-react";
import PlateCircle from "@/components/Etc/PlateCircle";
import { ARROW_SIZE, NEIGHBOR_SCALE, computeLayout, useViewportWidth } from "@/components/WhatsInside/layout";
import { ETC_CATEGORIES, ETC_PHOTOS } from "@/lib/etc";

// Matches Carousel.tsx's own arrow styling exactly — fixed size (not scaled
// to viewport the way the rest of this page used to be), same as the home
// page carousel.
const ARROW_BUTTON_CLASS =
  "flex h-[2.25rem] w-[2.25rem] flex-shrink-0 items-center justify-center rounded-full border border-black/50 bg-white text-black/50 transition-colors hover:border-[#2460A4] hover:text-[#2460A4]";

const CENTER_SCALE = 1.1; // smaller than Carousel.tsx's own 1.3 — the featured photo here was reading too large
const FAR_SCALE = 0.55; // matches Carousel.tsx's own dist>=2 scale

// The plate's diameter relative to itemSize (computeLayout's own uniform
// item size — the same one the home page carousel uses).
const PLATE_SCALE = 2.5;
// Fraction of the plate's own diameter that hangs off the bottom edge,
// clipped by its wrapper below. 0.67 leaves ~1/3 of the circle peeking above
// the item row.
const BLEED_FRACTION = 0.67;
// Fraction of itemSize left as breathing room between the item ring and the
// plate's own rim — smaller than before so the plate's visible top sits
// higher, closer under the photo row instead of leaving a big empty gap.
const PLATE_ITEM_GAP_RATIO = -0.12;

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
  const viewportWidth = useViewportWidth();
  // Exactly the home page carousel's own layout math — same item size,
  // spacing, and gap formulas it uses. Nothing here is etc-specific; the
  // only thing that differs from Carousel.tsx is that these linear
  // distances get bent onto an arc below instead of laid out in a line.
  const { itemSize, imageSize, spacing, gap } = computeLayout(viewportWidth);

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
  const plateVisibleBelowHub = Math.max(0, plateSize * (1 - BLEED_FRACTION));

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
  const areaHeight = topReach + plateVisibleBelowHub;
  const areaWidth = Math.abs(rightArrowSlot.x) * 2 + ARROW_SIZE + 16;

  const selected = selectedIndex !== null ? photos[selectedIndex] : null;

  return (
    <section
      className="relative mx-auto w-full max-w-[96rem] overflow-hidden px-4 pt-8 text-center"
      style={{
        // Caps this page to exactly one viewport below the sticky header
        // (same --taskbar-height var Jar.js's hero reads) so the plate's
        // bleed is hard-clipped at the fold instead of trailing off into a
        // tall scroll of mostly-empty space — the footer then lands right
        // at that cutoff instead of after a big gap.
        height: "calc(100dvh - var(--taskbar-height, 4.375rem))",
      }}
    >
      <Link
        href="/etc"
        aria-label="Back to What's on my plate"
        className={`absolute left-4 top-8 z-20 ${ARROW_BUTTON_CLASS}`}
        onClick={(e) => {
          e.preventDefault();
          setSelectedIndex(null);
          setIsExiting(true);
        }}
      >
        <ArrowLeft size={20} strokeWidth={1.25} />
      </Link>

      <motion.div
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
          <div className="relative mx-auto mt-16" style={{ width: plateSize, height: plateRadius + plateVisibleBelowHub }}>
            {/* Sits just above the plate rather than at the bottom of its (tall,
                viewport-clipped) container — the plate's own lower portion may
                get cut off at the fold, but this stays safely above that line. */}
            <p className="absolute inset-x-0 -top-6 font-roboto text-sm text-gray-400">Coming soon.</p>
            <div
              className="absolute left-1/2 -translate-x-1/2 overflow-hidden"
              style={{ top: 0, width: plateSize, height: plateRadius + plateVisibleBelowHub }}
            >
              <PlateCircle label="" size={plateSize} className="absolute left-0 top-0" />
            </div>
          </div>
        ) : (
          <div
            className="relative mx-auto mt-8"
            style={{ width: areaWidth, height: areaHeight }}
          >
          {/* Hub: the plate, both arrows, and the item track are all
              positioned relative to this single anchor point, the same way
              the previous arc version worked. */}
          <div className="absolute left-1/2" style={{ bottom: plateVisibleBelowHub }}>
            <div
              className="absolute left-1/2 -translate-x-1/2 overflow-hidden"
              style={{ top: -plateRadius, width: plateSize, height: plateRadius + plateVisibleBelowHub }}
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
                // Keyed so the one-time correction from the unmeasured
                // (viewportWidth===0) default to the real viewport width
                // remounts this fresh instead of animating a spring/tween
                // between the two — exactly Carousel.tsx's own fix for the
                // same issue (see its comment). Without the key, itemSize
                // (and therefore attachRadius and every item's arc slot)
                // jumps from the small SSR-default layout to the real one on
                // an already-mounted tree, which Framer springs through
                // instead of snapping to, reading as the whole fan expanding
                // outward from the plate on first paint.
                key={viewportWidth === 0 ? "measuring" : "ready"}
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
