"use client";

import { useEffect, useLayoutEffect, useState } from "react";

export const NEIGHBOR_SCALE = 0.72;
// Must match the arrow buttons' own h-[2.25rem] w-[2.25rem] Tailwind class.
export const ARROW_SIZE = 36;

const MIN_ITEM_SIZE = 120; // px — floor so items stay legible on the smallest phones
const MAX_ITEM_SIZE = 440; // px — the original desktop design size, used as a ceiling
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
export function computeLayout(viewportWidth: number) {
  const available = Math.max(viewportWidth - PAGE_PADDING, 240);
  const denom = 1 + 2 * NEIGHBOR_SCALE + 4 * GAP_RATIO;
  const solvedItemSize = (available - 2 * ARROW_SIZE) / denom;
  const itemSize = Math.min(MAX_ITEM_SIZE, Math.max(MIN_ITEM_SIZE, solvedItemSize));

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
