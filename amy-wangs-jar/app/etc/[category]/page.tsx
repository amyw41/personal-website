"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { notFound, useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ChevronLeft, ChevronRight, X } from "lucide-react";
import PlateCircle from "@/components/Etc/PlateCircle";
import { ARROW_SIZE, MAX_ITEM_SIZE, computeLayout, useElementSize, useViewportWidth } from "@/components/WhatsInside/layout";
import { ETC_CATEGORIES, ETC_PHOTOS, type EtcPhoto } from "@/lib/etc";

// Matches Carousel.tsx's own arrow styling exactly — fixed size (not scaled
// to viewport the way the rest of this page used to be), same as the home
// page carousel.
const ARROW_BUTTON_CLASS =
  "flex h-[2.25rem] w-[2.25rem] flex-shrink-0 items-center justify-center rounded-full border border-black/50 bg-white text-black/50 transition-colors hover:border-[#2460A4] hover:text-[#2460A4]";

// Photo emphasis is a CSS `scale` transform ONLY — applied once, here. Photo
// *sizes* (the box every photo is laid out in) never separately inflate for
// any one role; see `cap` below. Mixing both (a bigger box for the center
// AND a bigger scale) was the previous implementation's bug: double-applying
// the same emphasis through two mechanisms that had to be kept in sync by
// hand and eventually didn't.
const CENTER_SCALE = 1.15;
const NEIGHBOR_SCALE = 0.78;
const FAR_SCALE = 0.55; // dist >= 2 — always opacity 0, so its exact value barely matters beyond "not huge"

// Fixed pixel gap between every pair of neighboring photos' own rendered
// edges — the same literal constant for every pair, regardless of aspect
// ratio (see angleForChord below, which solves the *angle* needed to hit
// this exact pixel gap for whichever two specific photos are actually
// adjacent, rather than eyeballing a per-pair angle). Large enough to read
// as a clear, deliberate separation rather than "barely not touching" — safe
// to tune by eye because the chord math below (see rotatedHalfExtents' use
// in the angle-walk loop) now accounts for each photo's true *rotated*
// footprint, not just its raw unrotated half-width, so bumping this number
// alone can no longer be defeated by that undercount.
const PHOTO_GAP_PX = 36;
// Same idea, from a neighbor photo's own outer edge to its arrow's edge.
const ARROW_GAP_PX = 14;
// Vertical gap between the plate's own visible top edge and the closest
// point of the actual rendered photo/arrow cluster (see the yShift
// derivation below, in the main component, which solves for this exactly
// from the real rotated geometry rather than letting it fall out of
// `radius` as an accident). Independent of radius/SIZE_SCALE/PHOTO_GAP_PX —
// none of those should require retuning this.
const PLATE_GAP_PX = 12;

// Safety margin added on top of the hard floor `radius` is never allowed
// below (see deriveRadius) — pure breathing room, not part of the
// correctness argument itself.
const RADIUS_SAFETY_MARGIN_PX = 24;
// The angle deriveRadius *designs* the radius around for the worst-case
// adjacent pair in a category — comfortably under MAX_STEP_DEG (the hard
// sanity ceiling below) so real categories land with margin to spare, not
// right at the edge of the assertion firing.
const TARGET_STEP_DEG = 44;
// Hard sanity ceiling from the task's own guidance: a real per-photo angular
// step should never need to exceed this. Checked in dev only (see
// assertStepAngle) — if this ever fires, the fix is a smaller PHOTO_GAP_PX,
// a smaller CENTER_SCALE/NEIGHBOR_SCALE, or a bigger TARGET_STEP_DEG, not
// silencing the assertion.
const MAX_STEP_DEG = 50;
// Breathing room around the mask/container's own computed bounds (see
// deriveBounds) — a fixed pixel pad, not a substitute for computing the
// bounds themselves from the actual rendered geometry.
const CONTAINER_PADDING_PX = 16;

// The plate's diameter relative to itemSize, and how much of it hangs off
// the bottom edge (clipped by its own wrapper) — unrelated to the arc
// rebuild below; kept as-is from the previous implementation.
const PLATE_SCALE = 2.5;
const BLEED_FRACTION = 0.67;

// Scales the photos' own rendered size AND the plate together, on top of
// itemSize — without touching itemSize itself, which still separately drives
// the arrow button footprint and is what computeLayout solves the row width
// around (see `cap` and `plateSize` below, the only two places this is
// applied). radius/the container bounds are already derived from cap and
// plateSize rather than hardcoded, so scaling those two is sufficient.
const SIZE_SCALE = 1.5;

const SECTION_PADDING_TOP = 32; // px, matches the section's own pt-8
const SECTION_PADDING_X = 32; // px, matches the section's own px-4 (16px each side)
const HEADER_AREA_GAP = 32; // px, matches the area wrapper's own mt-8
const EMPTY_HEADER_AREA_GAP = 64; // px, matches the empty-state wrapper's own mt-16
// Deliberate gap between the whole plate+photos assembly and the footer
// that follows this section — reserved directly out of the available height
// budget (see fitScale below), so it's a real, constant gap rather than
// whatever happens to be left over.
const FOOTER_GAP_PX = 32;

const isDev = process.env.NODE_ENV !== "production";

// The photo's own image box, at up to `cap` on its larger dimension and
// scaled down on the smaller one to match its real aspect ratio (from
// lib/etc.ts's own width/height fields) — the ONE size value used for this
// photo's box, its angle-gap math, and (via deriveBounds) the mask/container
// bounds. Never guessed independently in more than one place.
function getPhotoBoxSize(photo: EtcPhoto, cap: number) {
  const aspect = photo.width / photo.height;
  return aspect >= 1 ? { width: cap, height: cap / aspect } : { width: cap * aspect, height: cap };
}

function scaleForDist(dist: number) {
  if (dist === 0) return CENTER_SCALE;
  if (dist === 1) return NEIGHBOR_SCALE;
  return FAR_SCALE;
}

// Position on the arc `angleDeg` degrees around from center (0 = dead
// center/top, positive = right, negative = left) at the given radius — the
// ONE radius used for every photo and both arrows; nothing else in this file
// introduces a second radius. `angleDeg` doubles as the tangent rotation
// (see the render loop below) instead of a separately-tracked tilt value.
function getArcSlot(angleDeg: number, radius: number) {
  const rad = ((90 - angleDeg) * Math.PI) / 180;
  return { x: Math.cos(rad) * radius, y: -Math.sin(rad) * radius };
}

// Exact chord -> angle conversion: for two points each `radius` from a
// shared center, separated by a straight-line (chord) distance `chord`, the
// angle between them is 2*asin(chord / (2*radius)). Domain-guarded — asin is
// only defined for an input in [-1, 1], i.e. chord <= 2*radius — by clamping
// the ratio to CHORD_RATIO_MAX (a hair under 1) so a chord right at or past
// the circle's own diameter returns a large-but-finite angle instead of NaN.
// `radius` is chosen elsewhere (see deriveRadius) specifically so this clamp
// is never actually hit in normal use; it exists as a last-resort guard, not
// the primary correctness mechanism.
const CHORD_RATIO_MAX = 0.95;
function angleForChord(chord: number, radius: number) {
  if (radius <= 0) return 0;
  const ratio = Math.min(CHORD_RATIO_MAX, chord / (2 * radius));
  return (2 * Math.asin(ratio) * 180) / Math.PI;
}

// The rendered half-width/half-height of a `width` x `height` box once it's
// been rotated by `angleDeg` — used to size the mask/container from the
// *actual* rotated footprint of whatever's actually placed in it, instead of
// guessing an unrotated bound.
function rotatedHalfExtents(width: number, height: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  const c = Math.abs(Math.cos(rad));
  const s = Math.abs(Math.sin(rad));
  return { halfWidth: (width * c + height * s) / 2, halfHeight: (width * s + height * c) / 2 };
}

// Every element inside `container` that Tab can actually land on — used to
// trap focus within the lightbox while it's open (see the keydown effect
// below). A plain query rather than something fancier since the lightbox's
// own content is simple (currently just the close button), but written to
// keep working if a link or button ever gets added to the caption.
function getFocusableElements(container: HTMLElement) {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  );
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
  // not the wrapped photo index; `index` (the actual centered photo) is just
  // step mod photoCount, derived below once photoCount is known.
  const [step, setStep] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  // The element that opened the lightbox (the center photo's own button) —
  // saved so focus can return to it specifically when the lightbox closes,
  // rather than wherever the browser's own default focus-loss behavior would
  // otherwise land (usually <body>).
  const lightboxTriggerRef = useRef<HTMLElement | null>(null);
  // The lightbox's own dialog element — used both to move focus to its close
  // button when it opens and to find every Tab-able element inside it for
  // the focus trap (see the keydown effect below).
  const lightboxRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const viewportWidth = useViewportWidth();
  // Measures the section's own rendered height (the fixed 100dvh-minus-header
  // box below) and the title's, so the assembly below can be scaled down to
  // whatever vertical room is actually left (see fitScale) instead of
  // overflowing it.
  const [sectionRef, sectionSize] = useElementSize<HTMLElement>();
  const [headerRef, headerSize] = useElementSize<HTMLHeadingElement>();

  // When photoCount is even, the photo exactly opposite center can't split
  // evenly between the two sides — the tie always resolves to the right, so
  // every step forces exactly one photo to jump straight from "visible on
  // the left" to "invisible on the right" (or back). Animating x/y for a
  // jump like that directly would sweep the photo across the plate in a
  // straight line instead of riding the arc, so jumps snap to their last
  // real on-screen spot instead (see lastSlotRef below) and let opacity
  // carry the fade.
  const lastStepRef = useRef(-1);
  const prevOffsetsRef = useRef<Map<number, number>>(new Map());
  const workingOffsetsRef = useRef<Map<number, number>>(new Map());
  // Each photo's last real (non-frozen) rendered slot, keyed by its own src
  // — read to freeze a jumping photo at wherever it last actually was, and
  // always updated to the fresh value so a *future* jump has something
  // accurate to freeze at too.
  const lastSlotRef = useRef<Map<string, { x: number; y: number; rotate: number; scale: number }>>(new Map());

  useEffect(() => {
    setStep(0);
    lastStepRef.current = -1;
    prevOffsetsRef.current = new Map();
    workingOffsetsRef.current = new Map();
    lastSlotRef.current = new Map();
  }, [category?.slug]);

  useEffect(() => {
    if (selectedIndex === null) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedIndex(null);
        return;
      }
      // Trap Tab/Shift+Tab within the lightbox: wrap from the last focusable
      // element back to the first (and vice versa for Shift+Tab) instead of
      // letting focus escape into the page underneath, which is still there
      // (just visually covered by the backdrop) and would otherwise still
      // receive it.
      if (e.key !== "Tab" || !lightboxRef.current) return;
      const focusable = getFocusableElements(lightboxRef.current);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedIndex]);

  // Moves focus into the lightbox (its close button) the moment it opens,
  // and — on the cleanup, which fires exactly when selectedIndex flips back
  // to null — returns it to whatever triggered the open in the first place,
  // instead of leaving focus stranded on a now-hidden element (or wherever
  // the browser's own default happens to land it).
  useEffect(() => {
    if (selectedIndex === null) return;
    closeButtonRef.current?.focus();
    return () => {
      lightboxTriggerRef.current?.focus();
    };
  }, [selectedIndex]);

  if (!category) notFound();

  const photos = ETC_PHOTOS[category.slug];
  const photoCount = photos.length;
  const index = photoCount === 0 ? 0 : ((step % photoCount) + photoCount) % photoCount;

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

  // Only ONE size value drives everything below: this cap. Every photo's own
  // box comes from getPhotoBoxSize(photo, cap); nothing else guesses a
  // different size for the same photo anywhere else in this file.
  const { itemSize } = computeLayout(viewportWidth, MAX_ITEM_SIZE);
  const cap = itemSize * SIZE_SCALE;

  const plateSize = itemSize * SIZE_SCALE * PLATE_SCALE;
  const plateVisibleBelowHub = Math.max(0, plateSize * (1 - BLEED_FRACTION));

  const offsetByIndex = photos.map((_, i) => wrappedOffset(i));

  // The ONE radius used to place both photos and arrows — large enough that
  // even the worst-case adjacent pair (the two biggest role-scaled photos in
  // this category, since which specific photo lands in which role changes
  // as the user navigates) can't produce an angle past MAX_STEP_DEG, and
  // never smaller than the hard floor the task's own guidance specifies:
  // r >= (maxPhotoWidth + gap) / 2 + margin.
  //
  // The per-pair angle-walk below (see `walk`) measures each photo's extent
  // toward its neighbor along the *actual chord direction*, which can be
  // considerably more than its raw half-width once a photo is rotated far
  // enough from horizontal — so sizing this design estimate off raw
  // half-width would undersize `radius` for what the walk can actually
  // demand. A box's half-*diagonal* is the one rotation-angle-independent
  // upper bound on that (rotatedHalfExtents(...).halfWidth, at any angle,
  // never exceeds it), so using it here keeps this a real worst case
  // instead of an approximation that the walk can exceed.
  let radius = 0;
  if (photoCount > 0) {
    const maxHalfDiagonalAtCap = Math.max(
      ...photos.map((p) => {
        const box = getPhotoBoxSize(p, cap);
        return Math.sqrt(box.width * box.width + box.height * box.height) / 2;
      }),
    );
    const worstPairChord = maxHalfDiagonalAtCap * CENTER_SCALE + maxHalfDiagonalAtCap * NEIGHBOR_SCALE + PHOTO_GAP_PX;
    const radiusFloor = maxHalfDiagonalAtCap * CENTER_SCALE + PHOTO_GAP_PX / 2 + RADIUS_SAFETY_MARGIN_PX;
    const radiusForTargetAngle = worstPairChord / (2 * Math.sin((TARGET_STEP_DEG * Math.PI) / 360));
    radius = Math.max(radiusFloor, radiusForTargetAngle);

    if (isDev) {
      console.assert(
        radius >= maxHalfDiagonalAtCap,
        `EtcCategoryPage (${category.slug}): radius (${radius.toFixed(1)}px) is smaller than a photo's own half-diagonal (${maxHalfDiagonalAtCap.toFixed(1)}px).`,
      );
    }
  }

  // Each photo's signed angular position, walking outward from the current
  // center one real adjacent pair at a time — not a single shared step —
  // so the realized pixel gap between every neighboring pair is exactly
  // PHOTO_GAP_PX regardless of how differently two adjacent photos' aspect
  // ratios cap their rendered width. A single uniform step (the previous
  // implementation's approach) can only guarantee a MINIMUM gap across a
  // mixed-aspect-ratio set, not this exact one for every pair.
  const angleByIndex = new Array<number>(photoCount).fill(0);
  if (photoCount > 1) {
    const rightEntries = offsetByIndex
      .map((offset, i) => ({ i, offset }))
      .filter((e) => e.offset > 0)
      .sort((a, b) => a.offset - b.offset);
    const leftEntries = offsetByIndex
      .map((offset, i) => ({ i, offset }))
      .filter((e) => e.offset < 0)
      .sort((a, b) => b.offset - a.offset);

    const walk = (entries: { i: number; offset: number }[], sign: 1 | -1) => {
      let cum = 0;
      let prevI = index;
      let prevDist = 0;
      let prevAngle = 0;
      for (const { i, offset } of entries) {
        const dist = Math.abs(offset);
        const prevBox = getPhotoBoxSize(photos[prevI], cap);
        const prevScale = scaleForDist(prevDist);
        const box = getPhotoBoxSize(photos[i], cap);
        const scale = scaleForDist(dist);
        // Two rotated boxes, each `radius` from center, are genuinely
        // guaranteed not to overlap (by the separating-axis theorem) once
        // their extents *projected onto the line connecting their own two
        // centers* sum to less than that line's length — projecting onto
        // world-horizontal instead (i.e. just rotatedHalfExtents(...,
        // itsOwnAngle).halfWidth) is only an approximation of that and can
        // still let two photos overlap once their angles diverge enough
        // from horizontal. For two points on the same circle, that
        // connecting line is exactly tangent to the circle at their
        // midpoint angle, so re-using rotatedHalfExtents with each box's
        // angle *relative to that midpoint* gives the true, exact
        // projection instead — same helper, correct axis.
        //
        // The midpoint angle itself depends on photo `i`'s own final angle
        // (still being solved for here), so — like that angle — it's
        // resolved via the same fixed-point iteration rather than a closed
        // form.
        let stepDeg = 0;
        for (let iter = 0; iter < 8; iter++) {
          const angleGuess = cum + sign * stepDeg;
          const chordAngle = cum + (sign * stepDeg) / 2;
          const prevExt = rotatedHalfExtents(
            prevBox.width * prevScale,
            prevBox.height * prevScale,
            prevAngle - chordAngle,
          ).halfWidth;
          const ext = rotatedHalfExtents(box.width * scale, box.height * scale, angleGuess - chordAngle).halfWidth;
          const chord = prevExt + ext + PHOTO_GAP_PX;
          stepDeg = angleForChord(chord, radius);
        }
        if (isDev) {
          console.assert(
            stepDeg <= MAX_STEP_DEG,
            `EtcCategoryPage (${category.slug}): angle-per-photo step ${stepDeg.toFixed(1)}deg exceeds the ${MAX_STEP_DEG}deg sanity ceiling (pair: ${photos[prevI].src} <-> ${photos[i].src}).`,
          );
        }
        cum += sign * stepDeg;
        angleByIndex[i] = cum;
        prevI = i;
        prevDist = dist;
        prevAngle = cum;
      }
    };
    walk(rightEntries, 1);
    walk(leftEntries, -1);
  }

  // Arrows sit past their neighbor photo's own edge by ARROW_GAP_PX, on the
  // same radius. If a category has only one other photo total (photoCount
  // === 2), only one side ever has a real neighbor entry — the other side's
  // arrow mirrors that same step so it still has a sensible position instead
  // of nothing to measure against.
  const rightNeighbor = photoCount > 1 ? offsetByIndex.findIndex((o) => o === 1) : -1;
  const leftNeighbor = photoCount > 1 ? offsetByIndex.findIndex((o) => o === -1) : -1;
  let rightArrowAngle = 0;
  let leftArrowAngle = 0;
  if (photoCount > 1) {
    // The arrow's own half-extent doesn't need the chord-angle treatment
    // below since it's a circle (ARROW_SIZE is both its width and height) —
    // rotating it, or projecting it onto any axis, never changes its
    // footprint. The neighbor photo's extent does: same reasoning as the
    // walk loop above (the neighbor-to-arrow connecting line is the true
    // separating axis, not world-horizontal), resolved the same way via a
    // few fixed-point iterations since the arrow's own angle — half of
    // which sets that connecting line's direction — is what's being solved.
    const arrowStepFor = (neighborI: number, sign: 1 | -1) => {
      const neighborBox = getPhotoBoxSize(photos[neighborI], cap);
      const neighborAngle = angleByIndex[neighborI];
      let stepDeg = 0;
      for (let iter = 0; iter < 8; iter++) {
        const chordAngle = neighborAngle + (sign * stepDeg) / 2;
        const neighborExt = rotatedHalfExtents(
          neighborBox.width * NEIGHBOR_SCALE,
          neighborBox.height * NEIGHBOR_SCALE,
          neighborAngle - chordAngle,
        ).halfWidth;
        stepDeg = angleForChord(neighborExt + ARROW_GAP_PX + ARROW_SIZE / 2, radius);
      }
      return stepDeg;
    };
    if (rightNeighbor >= 0) {
      rightArrowAngle = angleByIndex[rightNeighbor] + arrowStepFor(rightNeighbor, 1);
    }
    if (leftNeighbor >= 0) {
      leftArrowAngle = angleByIndex[leftNeighbor] - arrowStepFor(leftNeighbor, -1);
    } else if (rightNeighbor >= 0) {
      leftArrowAngle = -rightArrowAngle;
    }
    if (rightNeighbor < 0 && leftNeighbor >= 0) {
      rightArrowAngle = -leftArrowAngle;
    }
  }
  // Nominal (unshifted) arrow slots — a hub-relative y of 0 here means
  // "resting exactly at the hub", same as every photo's own getArcSlot call.
  // Reused below both to measure the cluster's own bounds and to find how
  // close its nearest point naturally comes to the hub/plate, before the
  // deliberate PLATE_GAP_PX shift is applied.
  const leftArrowSlotNominal = getArcSlot(leftArrowAngle, radius);
  const rightArrowSlotNominal = getArcSlot(rightArrowAngle, radius);

  // Container/mask bounds — computed FROM the actual rendered (rotated)
  // footprint of whatever is actually visible (center + real neighbors +
  // arrows), never an independently-guessed formula. Farther (dist >= 2)
  // photos are always opacity 0 and excluded — clipping something invisible
  // has no visual effect either way.
  let topReach = 0;
  let sideReach = 0;
  // The nearest-to-hub edge (largest slot.y + half-extent, since y is
  // negative going up) among everything actually rendered — the real
  // "how close does the cluster already come to the plate" figure that
  // PLATE_GAP_PX is measured from, computed the same rigorous way as
  // topReach/sideReach rather than assumed from radius.
  let nearestClusterEdgeY = -Infinity;
  for (let i = 0; i < photoCount; i++) {
    const dist = Math.abs(offsetByIndex[i]);
    if (dist > 1) continue;
    const scale = scaleForDist(dist);
    const box = getPhotoBoxSize(photos[i], cap);
    const angle = angleByIndex[i];
    const slot = getArcSlot(angle, radius);
    const ext = rotatedHalfExtents(box.width * scale, box.height * scale, angle);
    topReach = Math.max(topReach, -slot.y + ext.halfHeight);
    sideReach = Math.max(sideReach, Math.abs(slot.x) + ext.halfWidth);
    nearestClusterEdgeY = Math.max(nearestClusterEdgeY, slot.y + ext.halfHeight);
  }
  if (rightNeighbor >= 0 || leftNeighbor >= 0) {
    topReach = Math.max(topReach, -rightArrowSlotNominal.y + ARROW_SIZE / 2, -leftArrowSlotNominal.y + ARROW_SIZE / 2);
    sideReach = Math.max(
      sideReach,
      Math.abs(rightArrowSlotNominal.x) + ARROW_SIZE / 2,
      Math.abs(leftArrowSlotNominal.x) + ARROW_SIZE / 2,
    );
    nearestClusterEdgeY = Math.max(
      nearestClusterEdgeY,
      rightArrowSlotNominal.y + ARROW_SIZE / 2,
      leftArrowSlotNominal.y + ARROW_SIZE / 2,
    );
  }

  // Shifts the whole arc (every photo + both arrows) vertically so the
  // cluster's own nearest point sits exactly PLATE_GAP_PX above the plate's
  // visible top edge (which stays anchored at the hub, y = 0) — solved
  // directly from nearestClusterEdgeY above, not left as an accident of
  // radius. Applied uniformly to every rendered y below (see shiftSlot).
  const yShift = photoCount > 0 ? -PLATE_GAP_PX - nearestClusterEdgeY : 0;
  const shiftSlot = (slot: { x: number; y: number }) => ({ x: slot.x, y: slot.y + yShift });

  const leftArrowSlot = shiftSlot(leftArrowSlotNominal);
  const rightArrowSlot = shiftSlot(rightArrowSlotNominal);

  if (photoCount > 0) {
    // topReach was measured from the nominal (unshifted) arc, so it needs
    // the same shift folded in: shifting the cluster up (yShift < 0) needs a
    // taller mask to still contain it; shifting it down needs less.
    topReach = topReach - yShift + CONTAINER_PADDING_PX;
  }
  const areaWidth = photoCount > 0 ? sideReach * 2 + CONTAINER_PADDING_PX * 2 : plateSize;
  const areaHeight = topReach + plateVisibleBelowHub;

  if (isDev) {
    for (let i = 0; i < photoCount; i++) {
      const angle = angleByIndex[i];
      const slot = shiftSlot(getArcSlot(angle, radius));
      if (Number.isNaN(angle) || Number.isNaN(slot.x) || Number.isNaN(slot.y)) {
        throw new Error(
          `EtcCategoryPage (${category.slug}): NaN in carousel geometry for photo "${photos[i]?.src}" (angle=${angle}, x=${slot.x}, y=${slot.y}).`,
        );
      }
    }
    if (
      Number.isNaN(leftArrowSlot.x) ||
      Number.isNaN(leftArrowSlot.y) ||
      Number.isNaN(rightArrowSlot.x) ||
      Number.isNaN(rightArrowSlot.y)
    ) {
      throw new Error(`EtcCategoryPage (${category.slug}): NaN in arrow geometry.`);
    }
  }

  // Scales the whole assembly (plate + photos + arrows, or just the plate in
  // the empty state) down to fit whatever vertical room is actually left
  // below the title — a plain CSS transform driven by this file's own
  // already-computed natural size, not a second hand-derived formula that
  // has to be kept in sync with the first. See the render below for how the
  // outer/inner split keeps layout (the footer's own position) in sync with
  // the visual scale.
  const headerAreaGap = photoCount === 0 ? EMPTY_HEADER_AREA_GAP : HEADER_AREA_GAP;
  const heightMeasured = sectionSize.height > 0 && headerSize.height > 0;
  const availableHeight = heightMeasured
    ? Math.max(0, sectionSize.height - SECTION_PADDING_TOP - headerSize.height - headerAreaGap - FOOTER_GAP_PX)
    : Infinity;
  const naturalHeight = photoCount === 0 ? plateVisibleBelowHub : areaHeight;
  // itemSize (via computeLayout) is only solved to fit Carousel.tsx's own
  // flat-layout width formula — this page's arc geometry is a different
  // shape entirely (its width comes from `radius`, which a landscape-heavy
  // category can push wider than that flat formula ever assumed), so
  // nothing about itemSize actually guarantees areaWidth fits the viewport.
  // fitScale has to account for width too, not just height, or a category
  // whose worst-case radius is wide enough can overflow the arrows straight
  // off the side of narrow viewports.
  const availableWidth = heightMeasured ? Math.max(0, sectionSize.width - SECTION_PADDING_X) : Infinity;
  const naturalWidth = photoCount === 0 ? plateSize : areaWidth;
  const fitScale =
    heightMeasured && naturalHeight > 0 && naturalWidth > 0
      ? Math.min(1, availableHeight / naturalHeight, availableWidth / naturalWidth)
      : 1;

  const selected = selectedIndex !== null ? photos[selectedIndex] : null;

  return (
    <section
      ref={sectionRef}
      className="relative mx-auto w-full max-w-[96rem] overflow-hidden px-4 pt-8 text-center"
      style={{
        // Caps this page to exactly one viewport below the sticky header
        // (same --taskbar-height var Jar.js's hero reads) so the assembly
        // below is scaled (see fitScale) to fit above the fold instead of
        // trailing off into a tall scroll of mostly-empty space.
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
        <h1 ref={headerRef} className="font-singsong text-[clamp(2rem,6vw,3.5rem)] leading-none text-[#2460A4]">
          {category.label}
        </h1>

        {photoCount === 0 ? (
          <div
            className="relative mx-auto mt-16"
            style={{ width: plateSize * fitScale, height: plateVisibleBelowHub * fitScale }}
          >
            {/* Sits just above the plate rather than at the bottom of its (tall,
                viewport-clipped) container — the plate's own lower portion may
                get cut off at the fold, but this stays safely above that line. */}
            <p className="absolute inset-x-0 -top-6 font-roboto text-sm text-gray-400">Coming soon.</p>
            <div
              className="absolute left-1/2 top-0"
              style={{ width: plateSize, height: plateVisibleBelowHub, transform: `translateX(-50%) scale(${fitScale})`, transformOrigin: "50% 0%" }}
            >
              <div className="absolute left-0 top-0 h-full w-full overflow-hidden">
                <PlateCircle label="" size={plateSize} className="absolute left-0 top-0" />
              </div>
            </div>
          </div>
        ) : (
          <div className="relative mx-auto mt-8" style={{ width: areaWidth * fitScale, height: areaHeight * fitScale }}>
            <div
              className="absolute left-1/2 top-0"
              style={{ width: areaWidth, height: areaHeight, transform: `translateX(-50%) scale(${fitScale})`, transformOrigin: "50% 0%" }}
            >
              {/* Hub: the plate, both arrows, and every photo are all
                positioned relative to this single anchor point. */}
              <div className="absolute left-1/2" style={{ bottom: plateVisibleBelowHub }}>
                <div
                  // top: 0 (flush with the hub) and a height of just
                  // plateVisibleBelowHub — cropping the plate circle down to
                  // only the sliver that hangs *below* the photo row, so it
                  // reads as the arc resting right on the plate's rim.
                  className="absolute left-1/2 -translate-x-1/2 overflow-hidden"
                  style={{ top: 0, width: plateSize, height: plateVisibleBelowHub }}
                >
                  <PlateCircle label="" size={plateSize} className="absolute left-0 top-0" />
                </div>

                {photoCount > 1 && (
                  <>
                    <motion.button
                      type="button"
                      key={`prev::${viewportWidth === 0 ? "measuring" : "ready"}`}
                      onClick={() => advance(-1)}
                      aria-label="Previous photo"
                      className={`absolute left-1/2 top-0 z-10 ${ARROW_BUTTON_CLASS}`}
                      style={{ marginLeft: -ARROW_SIZE / 2, marginTop: -ARROW_SIZE / 2 }}
                      initial={false}
                      animate={{ x: leftArrowSlot.x, y: leftArrowSlot.y, rotate: leftArrowAngle }}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    >
                      <ChevronLeft size={23} strokeWidth={1.25} />
                    </motion.button>
                    <motion.button
                      type="button"
                      key={`next::${viewportWidth === 0 ? "measuring" : "ready"}`}
                      onClick={() => advance(1)}
                      aria-label="Next photo"
                      className={`absolute left-1/2 top-0 z-10 ${ARROW_BUTTON_CLASS}`}
                      style={{ marginLeft: -ARROW_SIZE / 2, marginTop: -ARROW_SIZE / 2 }}
                      initial={false}
                      animate={{ x: rightArrowSlot.x, y: rightArrowSlot.y, rotate: rightArrowAngle }}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    >
                      <ChevronRight size={23} strokeWidth={1.25} />
                    </motion.button>
                  </>
                )}

                {/* Edge-faded so items don't hard-clip at the mask's own
                    left/right boundary — an alpha mask on the items
                    themselves, matching Carousel.tsx's own treatment. */}
                <div
                  className="absolute left-1/2 -translate-x-1/2 overflow-hidden"
                  style={{
                    top: -topReach,
                    width: areaWidth,
                    height: topReach,
                    WebkitMaskImage: "linear-gradient(to right, transparent, black 12%, black 88%, transparent)",
                    maskImage: "linear-gradient(to right, transparent, black 12%, black 88%, transparent)",
                  }}
                >
                  {photos.map((photo, i) => {
                    const offset = offsetByIndex[i];
                    const dist = Math.abs(offset);
                    const isCenter = dist === 0;
                    const imageOpacity = isCenter ? 1 : dist === 1 ? 0.55 : 0;
                    const angle = angleByIndex[i];
                    const freshSlot = shiftSlot(getArcSlot(angle, radius));
                    const fresh = { x: freshSlot.x, y: freshSlot.y, rotate: angle, scale: scaleForDist(dist) };

                    const prevOffset = prevOffsetsRef.current.get(i);
                    const jumped = prevOffset !== undefined && Math.abs(offset - prevOffset) > 1;
                    const key = photo.src;
                    const frozen = lastSlotRef.current.get(key);
                    // A jump straight from a visible slot into an invisible
                    // one would otherwise teleport to its new (offscreen)
                    // spot and only then start fading — an instant pop
                    // rather than a fade. Freezing at the last real slot for
                    // just this transition lets it fade out from where it
                    // was actually seen instead.
                    const target = jumped && frozen ? frozen : fresh;
                    lastSlotRef.current.set(key, fresh);

                    const photoBox = getPhotoBoxSize(photo, cap);

                    return (
                      <motion.button
                        type="button"
                        key={`${photo.src}::${viewportWidth === 0 ? "measuring" : "ready"}`}
                        onClick={
                          isCenter
                            ? (e) => {
                              // Saved here, not read from document.activeElement
                              // when the lightbox closes — by then this button
                              // may have moved or even unmounted (a different
                              // photo now centered), so the *element itself*
                              // needs to be captured up front.
                              lightboxTriggerRef.current = e.currentTarget;
                              setSelectedIndex(i);
                            }
                            : undefined
                        }
                        aria-label={isCenter ? `Open photo: ${photo.caption}` : undefined}
                        aria-hidden={!isCenter}
                        tabIndex={isCenter ? 0 : -1}
                        initial={false}
                        animate={{ x: target.x, y: target.y, rotate: target.rotate, scale: target.scale }}
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
                          style={{ width: photoBox.width, height: photoBox.height }}
                        >
                          <Image
                            src={photo.src}
                            alt={photo.caption}
                            fill
                            sizes={`${Math.round(photoBox.width)}px`}
                            draggable={false}
                            className="pointer-events-none select-none object-contain"
                          />
                        </motion.div>
                      </motion.button>
                    );
                  })}
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
              ref={lightboxRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="lightbox-caption"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="relative flex max-h-[85vh] w-[min(90vw,560px)] flex-col overflow-hidden rounded-lg bg-white shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                ref={closeButtonRef}
                onClick={() => setSelectedIndex(null)}
                aria-label="Close"
                className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-gray-700 shadow transition-colors hover:text-[#2460A4]"
              >
                <X size={18} />
              </button>
              <div className="relative h-[60vh] w-full">
                <Image src={selected.src} alt={selected.caption} fill className="object-contain" sizes="560px" />
              </div>
              <p id="lightbox-caption" className="px-6 py-4 font-roboto text-sm text-gray-600">
                {selected.caption}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
