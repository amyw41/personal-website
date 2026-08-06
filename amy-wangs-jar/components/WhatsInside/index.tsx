"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Gallery from "./Gallery";
import Carousel from "./Carousel";
import { computeLayout, useViewportWidth } from "./layout";

type View = "carousel" | "gallery";

const VIEWS: { id: View; label: string }[] = [
  { id: "carousel", label: "Carousel" },
  { id: "gallery", label: "Gallery" },
];

export default function WhatsInside() {
  const [view, setView] = useState<View>("carousel");
  // Carousel's own arrow-to-arrow span is the shared width source of truth —
  // Gallery is sized to match it (rather than the other way around) so
  // switching views never changes the section's overall width.
  const viewportWidth = useViewportWidth();
  const { totalWidth } = computeLayout(viewportWidth);

  // Which items' star badges are "lit" (yellow) — lives here, above both
  // views, rather than inside Carousel/Gallery individually, so starring an
  // item in one view still shows it starred after switching to the other
  // (they're the same underlying item, just two different presentations of
  // it). Keyed by item id, not index, so it stays correct regardless of
  // ordering in either view.
  const [litItems, setLitItems] = useState<Set<string>>(new Set());
  const toggleLit = (id: string) =>
    setLitItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    // pt-36/pb-36 are equal on purpose: this section is self-contained, like
    // Jar's own min-height + flex centering. Don't tune either value to
    // compensate for spacing elsewhere (e.g. margin-top on Footer) — that
    // coupling is exactly what made this fragile before.
    <section className="mx-auto w-full max-w-[96rem] px-4 pb-36 pt-36 text-center">
      <motion.h2
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.6 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="font-instrument text-[clamp(1.6rem,4.5vw,2.5rem)] leading-none text-[#2460A4]"
      >
        What&apos;s inside?
      </motion.h2>

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.6 }}
        transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
        className="mt-6 flex items-center justify-center"
      >
        <div className="inline-flex overflow-hidden rounded-[5px] border border-[#2460A4] font-instrument-sans text-[16px] font-normal">
          {VIEWS.map((v, i) => (
            <button
              key={v.id}
              type="button"
              onClick={() => setView(v.id)}
              aria-pressed={view === v.id}
              className={`px-8 py-0.5 transition-colors ${i === 0 ? "border-r border-[#2460A4]" : ""} ${view === v.id
                ? "bg-[#2460A4] text-white"
                : "bg-white text-[#2460A4] hover:bg-[#BFDBFE]"
                }`}
            >
              {v.label}
            </button>
          ))}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
        className="mx-auto mt-26"
        style={{ width: totalWidth, maxWidth: "100%" }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className={view === "gallery" ? "mt-[2px]" : undefined}
          >
            {view === "gallery" ? (
              <Gallery litItems={litItems} onToggleLit={toggleLit} />
            ) : (
              <Carousel litItems={litItems} onToggleLit={toggleLit} />
            )}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </section>
  );
}
