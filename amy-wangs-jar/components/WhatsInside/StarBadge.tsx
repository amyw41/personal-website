"use client";

import { motion, useAnimation } from "framer-motion";
import { Star } from "lucide-react";

const WHITE = "#FFFFFF";
const YELLOW = "#f5df69";

// Shared by Carousel.tsx and Gallery.tsx — purely a fun easter egg beyond the
// animation itself. Hover expands the whole badge; click spins the star icon
// in place (rotateY, not the circle behind it) and toggles it between white
// and yellow, staying yellow until clicked again.
//
// `lit`/`onToggle` are owned by the parent (Carousel/Gallery), not this
// component's own state — Carousel in particular only renders a StarBadge
// for whichever item is currently centered, unmounting/remounting a fresh
// instance as the centered item changes, so state stored locally here would
// always reset to white when you cycled away from an item and back. Lifting
// it up to a per-item-id record in the parent makes it survive that.
//
// `size`/`iconSize` default to Carousel's own original values (30px circle,
// 15px icon) — Gallery passes its own bigger ones to match its badge.
export default function StarBadge({
  lit,
  onToggle,
  size = 30,
  iconSize = 15,
}: {
  lit: boolean;
  onToggle: () => void;
  size?: number;
  iconSize?: number;
}) {
  const starControls = useAnimation();
  // Separate from starControls (which only ever animates the icon inside) —
  // this owns the button's own scale so "big while spinning" is guaranteed
  // regardless of hover state (e.g. on touch, where there's no hover at all
  // to fall back on) instead of depending on whileHover still being active
  // when the tap/click gesture ends.
  const buttonControls = useAnimation();
  const bounce = () => {
    onToggle();
    // Grows quickly, holds at the big size for most of the spin, then eases
    // back down right at the end — same 0.7s duration as the icon's own
    // spin below, so the two stay in sync.
    buttonControls.start({
      scale: [1, 1.15, 1.15, 1],
      transition: { duration: 0.7, times: [0, 0.15, 0.85, 1], ease: "easeInOut" },
    });
    starControls.start({
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
      className="flex items-center justify-center rounded-full bg-[#2460A4] text-white"
      style={{ height: size, width: size }}
    >
      <motion.span
        animate={starControls}
        style={{
          transformPerspective: 200,
          color: lit ? YELLOW : WHITE,
          transition: "color 0.7s ease-in-out",
        }}
        className="flex items-center justify-center"
      >
        {/* fill/color both set to currentColor so the CSS `color` transition
            above (not framer motion) drives the white-to-yellow swap — keeps
            the color change independent of the rotateY spin above it. */}
        <Star size={iconSize} fill="currentColor" color="currentColor" />
      </motion.span>
    </motion.button>
  );
}
