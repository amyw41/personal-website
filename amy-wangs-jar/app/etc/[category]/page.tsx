"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { notFound, useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import PlateCircle from "@/components/Etc/PlateCircle";
import { MAX_ITEM_SIZE, deriveLayout, useElementSize } from "@/components/WhatsInside/layout";
import { ETC_CATEGORIES, ETC_PHOTOS } from "@/lib/etc";

// Matches Carousel.tsx's own arrow styling exactly — fixed size (not scaled
// to viewport the way the rest of this page used to be), same as the home
// page carousel.
const ARROW_BUTTON_CLASS =
  "flex h-[2.25rem] w-[2.25rem] flex-shrink-0 items-center justify-center rounded-full border border-black/50 bg-white text-black/50 transition-colors hover:border-[#2460A4] hover:text-[#2460A4]";
// The prev/next nav arrows on the photo ring itself — bigger than
// ARROW_BUTTON_CLASS above (which stays as-is for the fixed back link), with
// its own NAV_ARROW_SIZE used in place of a shared value for the arc's own
// offset math below, so the ring actually makes room for the bigger buttons.
// 50px = 1.4x the original 36px (2.25rem) shared arrow size.
const NAV_ARROW_SIZE = 50;
const NAV_ARROW_BUTTON_CLASS =
  "flex h-[3.125rem] w-[3.125rem] flex-shrink-0 items-center justify-center rounded-full border border-black/50 bg-white text-black/50 transition-colors hover:border-[#2460A4] hover:text-[#2460A4]";

const CENTER_SCALE = 1.1; // smaller than Carousel.tsx's own 1.3 — the featured photo here was reading too large
// How big the immediate left/right neighbor photos render, as a visual scale
// applied on top of their own itemSize box — deliberately its own constant,
// distinct from Carousel.tsx's shared NEIGHBOR_SCALE. The arc's own
// spacing/arrow-offset math (see itemSpacing below) is re-derived from THIS
// value rather than the shared one, so bumping it makes the neighbor photos
// bigger *and* automatically widens the gaps between items to match, instead
// of making them overlap.
const PHOTO_NEIGHBOR_SCALE = 0.85;
const FAR_SCALE = 0.7; // was 0.55 (Carousel.tsx's own dist>=2 scale) — bumped up along with the neighbor scale above

// Frozen at the plate's original scale — the item ring's own geometry
// (attachRadius, topReach, and therefore the hub's on-screen position) is
// still built from THIS value, not PLATE_SCALE below, so shrinking/growing
// the plate's own rendered size never moves the item ring, arrows, or hub.
// Without this split, attachRadius (and everything built from it) was
// derived straight from the plate's own radius, so shrinking the plate also
// shrank the ring's radius — pulling the whole photo row down/inward along
// with it, not just the plate.
const PLATE_GEOMETRY_SCALE = 2.5;
// The plate's diameter relative to itemSize (deriveLayout's own uniform
// item size — the same formulas the home page carousel uses, just driven
// from a frozen design constant here instead of a re-solved viewport width).
// Purely how big the plate PNG itself renders — independent of
// PLATE_GEOMETRY_SCALE above, so this can be tuned freely without moving
// anything else.
const PLATE_SCALE = 2;
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
const PLATE_VISIBLE_RATIO = 0.35;
// Fraction of itemSize left as breathing room between the item ring and the
// plate's own rim — smaller than before so the plate's visible top sits
// higher, closer under the photo row instead of leaving a big empty gap.
const PLATE_ITEM_GAP_RATIO = -0.4;
// The actual "how curved" knob: a multiplier on attachRadius (below), the
// radius of the circle every photo sits on. Bigger radius = the same
// angular spread between items covers less vertical drop, so the left/right
// photos sit higher (flatter curve, corners "lift"); smaller = more sag.
// 1 = unchanged. Tune this single number up/down to taste.
const CURVE_FLATTEN = 1.2;

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
  // Frozen at the design constant, not re-solved per viewport. The whole
  // composition — item spacing, arrow position, plate size, and the
  // plate's own crop line — is designed once at this one fixed size, then
  // scaled as a single unit to fit whatever space is actually available
  // (see `scale` below). That's what keeps every one of those pieces in
  // sync with every other one: nothing here can independently drift out of
  // proportion with anything else the way separately-tuned per-viewport
  // formulas (this page's old approach) eventually did.
  const { itemSize, imageSize, gap } = deriveLayout(MAX_ITEM_SIZE);
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

  // The radius the whole row curves around — tied to the plate's frozen
  // geometry scale (not its own possibly-different rendered size, see
  // PLATE_GEOMETRY_SCALE's own comment), so items ride close around where
  // the plate's rim always was, regardless of how big the plate itself
  // actually renders.
  const plateGeometryRadius = (itemSize * PLATE_GEOMETRY_SCALE) / 2;
  const attachRadius = (plateGeometryRadius + itemSize * (0.5 + PLATE_ITEM_GAP_RATIO)) * CURVE_FLATTEN;
  // The plate's own actual rendered box — independent of plateGeometryRadius
  // above, so this can shrink/grow without moving the item ring.
  const plateSize = itemSize * PLATE_SCALE;
  // See PLATE_VISIBLE_RATIO's own comment — the actual crop height, small and
  // independent of plateGeometryRadius.
  const plateVisibleHeight = plateSize * PLATE_VISIBLE_RATIO;
  // The crop window's own top stays pinned plateGeometryRadius above the hub
  // — unchanged from the very first working version of this page, and now
  // independent of the plate's own rendered size too — so the visible sliver
  // stays immediately adjacent to the photo ring exactly like it always did,
  // and shrinking/growing the plate never moves that attach point, only the
  // plate's own size around it. Its bottom edge (this value) usually lands
  // *above* the hub, not below it — this is how far below the hub the
  // composition's own lowest visible pixel actually sits, which is normally
  // negative (nothing visible reaches down to the hub at all; the hub past
  // that point is just an invisible math reference the photo ring is built
  // from, not a pixel that needs to be included in the box).
  const plateBottomBelowHub = plateVisibleHeight - plateGeometryRadius;

  // Converts a *linear* distance — exactly what Carousel.tsx would use for
  // its flat `x: offset*spacing` — into the angle needed to cover that same
  // arc-length at attachRadius. This is the one real difference from the
  // home page carousel: everything else (spacing, sizing, opacity, scale) is
  // identical, just wrapped onto a curve instead of a straight line.
  const degFor = (linear: number) => (linear / attachRadius) * (180 / Math.PI);
  // deriveLayout's own `spacing` assumed neighbors render at the shared
  // NEIGHBOR_SCALE (0.72) — this page renders them at its own, bigger
  // PHOTO_NEIGHBOR_SCALE instead, so re-deriving spacing with the real
  // rendered neighbor size here is what keeps items from overlapping now
  // that they're bigger, without having to shrink them back down.
  const neighborSize = itemSize * PHOTO_NEIGHBOR_SCALE;
  const itemSpacing = itemSize / 2 + gap + neighborSize / 2;
  // The wheel's own per-step rotation — degFor(offset*itemSpacing) for any
  // integer offset is just offset*degFor(itemSpacing) (degFor is linear), so
  // this is the same per-item angle as before, just factored out to also
  // drive the wheel's rotation below.
  const angleStepDeg = degFor(itemSpacing);
  const arrowLinearOffset = itemSpacing + neighborSize / 2 + gap + NAV_ARROW_SIZE / 2;
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
  const areaWidth = Math.abs(rightArrowSlot.x) * 2 + NAV_ARROW_SIZE + 16;

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

  return (
    <section
      className="relative mx-auto flex w-full max-w-[96rem] flex-col overflow-hidden px-4 pt-6 text-center"
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
        // Matches Taskbar.js's own logo inset exactly at each breakpoint —
        // px-4 (16px) below md, px-8 (32px) at md and up. `fixed`, not
        // `absolute`, is what actually makes that line up on wide screens:
        // this section is capped at max-w-[96rem] and centered, so past that
        // width an `absolute left-N` here would measure from the section's
        // own (now inset) edge, not the true viewport edge Taskbar's logo
        // uses — drifting away from it the wider the screen gets. `fixed`
        // positions relative to the viewport directly, same as the sticky
        // header effectively is, so it's correct at any width. `top` is set
        // via style (below) instead of a Tailwind class since it now needs
        // to clear the header's real height (--taskbar-height), not just sit
        // top-3 within this section.
        className={`fixed left-4 z-20 md:left-8 ${ARROW_BUTTON_CLASS}`}
        style={{ top: "calc(var(--taskbar-height, 4.375rem) + 0.75rem)" }}
        onClick={(e) => {
          e.preventDefault();
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
              className="absolute -bottom-[15px] left-1/2"
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
            className="absolute -bottom-[15px] left-1/2"
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
            {/* top: -plateGeometryRadius (not the plate's own possibly
                different plateRadius) — keeps the crop window's top pinned
                right where the photo ring actually is, so the visible sliver
                reads as attached to the photos, not floating apart from
                them, and shrinking/growing the plate's own rendered size
                never moves that attach point. */}
            <div
              className="absolute left-1/2 -translate-x-1/2 overflow-hidden"
              style={{ top: -plateGeometryRadius, width: plateSize, height: plateVisibleHeight }}
            >
              <PlateCircle label="" size={plateSize} className="absolute left-0 top-0" />
            </div>

            {photoCount > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => advance(-1)}
                  aria-label="Previous photo"
                  className={`absolute z-10 ${NAV_ARROW_BUTTON_CLASS}`}
                  style={{
                    left: leftArrowSlot.x,
                    top: leftArrowSlot.y,
                    transform: `translate(-50%, -50%) rotate(${leftArrowSlot.rotate}deg)`,
                  }}
                >
                  <ChevronLeft size={32} strokeWidth={1.25} />
                </button>
                <button
                  type="button"
                  onClick={() => advance(1)}
                  aria-label="Next photo"
                  className={`absolute z-10 ${NAV_ARROW_BUTTON_CLASS}`}
                  style={{
                    left: rightArrowSlot.x,
                    top: rightArrowSlot.y,
                    transform: `translate(-50%, -50%) rotate(${rightArrowSlot.rotate}deg)`,
                  }}
                >
                  <ChevronRight size={32} strokeWidth={1.25} />
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
                  // Only the immediate left/right neighbors are click
                  // targets — clicking one centers it (advancing the wheel).
                  // The center photo itself isn't clickable (no lightbox
                  // anymore), and dist>=2 photos sit at opacity 0, still in
                  // the DOM but invisible, so making them "clickable" would
                  // mean clicking blank space. `offset` (this photo's true
                  // signed distance from center, not the freeze-adjusted
                  // posOffset below) is exactly the single step that lands
                  // it in the center — the same delta an arrow click would
                  // take, just aimed at whichever side this photo is on.
                  const clickable = dist === 1;

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
                  const scale = posDist === 0 ? CENTER_SCALE : posDist === 1 ? PHOTO_NEIGHBOR_SCALE : FAR_SCALE;
                  // scale (above) grows/shrinks each photo from its own
                  // center, so a bigger-scaled photo (the center one, 1.1x)
                  // pushes its bottom edge further from the hub than a
                  // smaller neighbor's (0.72x, 0.55x) — even though they're
                  // meant to sit on the same curve. Correcting this by
                  // recomputing the point at an adjusted RADIUS (through
                  // getArcSlot, the same math every other position on this
                  // arc already uses) keeps position and rotation
                  // self-consistent at any angle — a flat vertical nudge only
                  // happens to line up at the exact top-center angle, and
                  // visibly skews at any other angle once combined with the
                  // item's own rotation (this is what broke last time: the
                  // "center" item still has a nonzero angle, and therefore a
                  // nonzero rotation, whenever step isn't exactly 0).
                  const bottomAlignedRadius = attachRadius + (itemSize * (scale - 1)) / 2;
                  const slot = getArcSlot(itemStep * angleStepDeg, bottomAlignedRadius);

                  return (
                    <motion.button
                      type="button"
                      key={photo.src}
                      onClick={clickable ? () => advance(offset) : undefined}
                      aria-label={clickable ? `Center photo: ${photo.caption}` : undefined}
                      aria-hidden={!clickable}
                      tabIndex={clickable ? 0 : -1}
                      initial={false}
                      animate={{ x: slot.x, y: slot.y, rotate: slot.rotate, scale }}
                      transition={
                        jumped
                          ? { x: { duration: 0 }, y: { duration: 0 }, rotate: { duration: 0 }, scale: { duration: 0 } }
                          : { type: "spring", stiffness: 300, damping: 30 }
                      }
                      style={{
                        zIndex: 10 - dist,
                        pointerEvents: clickable ? "auto" : "none",
                        cursor: clickable ? "pointer" : undefined,
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
    </section>
  );
}
