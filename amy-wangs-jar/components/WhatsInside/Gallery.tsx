"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { WHATS_INSIDE_ITEMS, type WhatsInsideItem } from "@/lib/items";
import StarBadge from "./StarBadge";

// Card padding + image size step up together across breakpoints (p-4/192px
// at base up to p-9/288px at xl) — the original fixed p-9 + 256-288px image
// only ever fit comfortably on wide desktop viewports; at grid-cols-1 on a
// 320-375px phone it alone exceeded the available width. Each tier below is
// sized to fit its narrowest viewport with real margin, not just eyeballed.
function GalleryCard({
  item,
  column,
  lit,
  onToggleLit,
}: {
  item: WhatsInsideItem;
  column: number;
  lit: boolean;
  onToggleLit: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      tabIndex={0}
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.5, ease: "easeOut", delay: column * 0.08 }}
      className="relative flex flex-col items-center rounded-2xl p-3 xl:p-6 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2460A4]"
    >
      <motion.div
        animate={{ opacity: hovered ? 1 : 0, scale: hovered ? 1 : 0.6 }}
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
        className="absolute right-[1.125rem] top-[1.125rem]"
      >
        <StarBadge size={42} iconSize={21} lit={lit} onToggle={onToggleLit} />
      </motion.div>

      <motion.div
        animate={{ opacity: hovered ? 1 : 0.5, scale: hovered ? 1.15 : 1.12 }}
        transition={{ type: "spring", stiffness: 300, damping: 15 }}
        className="relative h-[9.6rem] w-[9.6rem] sm:h-[11.2rem] sm:w-[11.2rem] lg:h-[12.8rem] lg:w-[12.8rem] xl:h-[14.4rem] xl:w-[14.4rem]"
      >
        <Image
          src={item.image}
          alt={item.name}
          fill
          sizes="(min-width: 1280px) 230px, (min-width: 1024px) 205px, (min-width: 640px) 179px, 154px"
          draggable={false}
          className="select-none object-contain"
        />
      </motion.div>

      <motion.div
        initial={false}
        animate={{ opacity: hovered ? 1 : 0.5, y: hovered ? 0 : 8 }}
        transition={{ duration: 0.2 }}
        className="mt-9 text-center"
      >
        <p className="max-w-[270px] font-roboto text-base text-gray-500">
          {item.description}
        </p>
      </motion.div>
    </motion.div>
  );
}

export default function Gallery({
  litItems,
  onToggleLit,
}: {
  litItems: Set<string>;
  onToggleLit: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {WHATS_INSIDE_ITEMS.map((item, i) => (
        <GalleryCard
          key={item.id}
          item={item}
          column={i % 3}
          lit={litItems.has(item.id)}
          onToggleLit={() => onToggleLit(item.id)}
        />
      ))}
    </div>
  );
}
