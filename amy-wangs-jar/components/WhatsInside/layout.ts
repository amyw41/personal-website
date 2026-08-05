"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

export const NEIGHBOR_SCALE = 0.72;
// Must match the arrow buttons' own h-[2.25rem] w-[2.25rem] Tailwind class.
export const ARROW_SIZE = 36;

const MIN_ITEM_SIZE = 120; // px — floor so items stay legible on the smallest phones
// Exported so callers (e.g. the plate page) can further cap the ceiling
// themselves — passed as computeLayout's own maxItemSize when a viewport is
// short enough that the design-size ceiling would still overflow it.
export const MAX_ITEM_SIZE = 440; // px — the original desktop design size, used as a ceiling
const GAP_RATIO = 29 / 360; // preserves the original design's gap:itemSize ratio at any size
const IMAGE_RATIO = 256 / 360; // preserves the original image:itemSize ratio at any size
const PAGE_PADDING = 32; // matches the page's own px-4 (16px) on each side

// Solves for the item size that makes the whole arrow-to-arrow row exactly
// fit the available width (viewport minus page padding) — the carousel used
// to snap between two fixed-px sizes (a "base" tier that was itself ~936px
// wide, guaranteed to overflow every phone and most tablets). Deriving every
// dimension from a formula instead means it can never overflow by
// construction, at any viewport width, not just the two sizes someone
// happened to test.
// `maxItemSize` defaults to the design ceiling (Carousel.tsx's own usage,
// unconstrained by anything but width) but callers with a second constraint
// to satisfy — the plate page capping itemSize so its arc + plate fit a
// short viewport's height too — can pass a tighter one.
export function computeLayout(viewportWidth: number, maxItemSize: number = MAX_ITEM_SIZE) {
  const available = Math.max(viewportWidth - PAGE_PADDING, 240);
  const denom = 1 + 2 * NEIGHBOR_SCALE + 4 * GAP_RATIO;
  const solvedItemSize = (available - 2 * ARROW_SIZE) / denom;
  const itemSize = Math.min(maxItemSize, Math.max(MIN_ITEM_SIZE, solvedItemSize));

  const gap = itemSize * GAP_RATIO;
  const imageSize = itemSize * IMAGE_RATIO;
  const neighborSize = itemSize * NEIGHBOR_SCALE;
  const spacing = itemSize / 2 + gap + neighborSize / 2;
  const containerWidth = 2 * (spacing + neighborSize / 2);
  const totalWidth = 2 * ARROW_SIZE + 2 * gap + containerWidth;
  return { itemSize, imageSize, spacing, containerWidth, gap, totalWidth };
}

// useLayoutEffect is a no-op on the server (React warns if called during
// SSR), so alias to useEffect there and only use the real layout effect in
// the browser.
const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

// Starts at 0 identically on every render path — server, hydration, and any
// later client-only mount — so there's never a server/client value to
// hydration-mismatch against. The layout effect then corrects it
// *synchronously before the browser paints*, so despite starting from 0
// there's no visible flash of the wrong size on any mount path.
//
// A plain useEffect would still be hydration-safe but runs *after* paint, so
// the corrected value would visibly snap in a frame late — which is exactly
// the bug this hook exists to avoid.
export function useViewportWidth() {
  const [width, setWidth] = useState(0);

  useIsomorphicLayoutEffect(() => {
    const update = () => setWidth(window.innerWidth);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return width;
}

// Tracks a DOM node's own rendered box size (via ResizeObserver, not the
// viewport) — same start-at-zero-then-correct-before-paint shape as
// useViewportWidth above, for the same reason: measuring something the
// server can't know without ever flashing the wrong value. Used by the plate
// page to learn how much vertical room its header actually takes up, so it
// can shrink the plate to fit what's left instead of overflowing it.
export function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setSize({ width: el.offsetWidth, height: el.offsetHeight });
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return [ref, size] as const;
}
