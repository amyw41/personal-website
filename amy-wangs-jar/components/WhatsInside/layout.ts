"use client";

import { useEffect, useLayoutEffect, useState } from "react";

export const NEIGHBOR_SCALE = 0.72;
// Must match the arrow buttons' own h-[2.625rem] w-[2.625rem] Tailwind class.
export const ARROW_SIZE = 42;

// Item box size and the gap we want between every element (arrow-neighbor,
// neighbor-center, center-neighbor, neighbor-arrow) at each breakpoint —
// matches the sm: breakpoint used by the item box's own Tailwind classes.
export const LAYOUT = {
  base: { itemSize: 387, gap: 29 },
  sm: { itemSize: 469, gap: 43 },
};

// Deriving spacing/container width FROM the desired gap (rather than the
// other way around) is what guarantees every gutter — arrow to neighbor,
// neighbor to center, and so on — ends up visually equal. `totalWidth` is
// the full arrow-to-arrow span; it's the shared width source of truth that
// the Gallery view is sized to match, so both views read as the same width.
export function computeLayout(isSm: boolean) {
  const { itemSize, gap } = isSm ? LAYOUT.sm : LAYOUT.base;
  const neighborSize = itemSize * NEIGHBOR_SCALE;
  const spacing = itemSize / 2 + gap + neighborSize / 2;
  const containerWidth = 2 * (spacing + neighborSize / 2);
  const totalWidth = 2 * ARROW_SIZE + 2 * gap + containerWidth;
  return { spacing, containerWidth, gap, totalWidth };
}

// useLayoutEffect is a no-op on the server (React warns if called during
// SSR), so alias to useEffect there and only use the real layout effect in
// the browser.
const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

// Starts `false` identically on every render path — server, hydration, and
// any later client-only mount — so there's never a server/client value to
// hydration-mismatch against. The layout effect then corrects it
// *synchronously before the browser paints*, so despite starting from
// `false` there's no visible flash of the wrong size on any mount path:
// neither the initial page load (when this can be server-rendered) nor a
// later remount from toggling views back and forth.
//
// A plain useEffect would still be hydration-safe but runs *after* paint,
// so the corrected value would visibly snap in a frame late — which is
// exactly the bug this hook exists to avoid.
export function useIsSm() {
  const [isSm, setIsSm] = useState(false);

  useIsomorphicLayoutEffect(() => {
    const mq = window.matchMedia("(min-width: 640px)");
    const update = () => setIsSm(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return isSm;
}
