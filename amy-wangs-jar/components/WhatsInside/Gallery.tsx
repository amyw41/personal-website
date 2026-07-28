"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { WHATS_INSIDE_ITEMS, type WhatsInsideItem } from "@/lib/items";

function GalleryCard({ item, column }: { item: WhatsInsideItem; column: number }) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.5, ease: "easeOut", delay: column * 0.08 }}
      className="relative flex flex-col items-center rounded-2xl p-9"
    >
      <motion.div
        animate={{ opacity: hovered ? 1 : 0, scale: hovered ? 1 : 0.6 }}
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
        className="absolute right-[1.125rem] top-[1.125rem] flex h-[2.625rem] w-[2.625rem] items-center justify-center rounded-full bg-[#2460A4] text-white"
      >
        <Star size={21} strokeWidth={2.5} fill="currentColor" />
      </motion.div>

      <motion.div
        animate={{ opacity: hovered ? 1 : 0.5, scale: hovered ? 1.15 : 1.1 }}
        transition={{ type: "spring", stiffness: 300, damping: 15 }}
        className="relative h-64 w-64 sm:h-72 sm:w-72"
      >
        <Image
          src={item.image}
          alt={item.name}
          fill
          sizes="(min-width: 640px) 288px, 256px"
          draggable={false}
          className="select-none object-contain"
        />
      </motion.div>

      <motion.div
        initial={false}
        animate={{ opacity: hovered ? 1 : 0, y: hovered ? 0 : 8 }}
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

export default function Gallery() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {WHATS_INSIDE_ITEMS.map((item, i) => (
        <GalleryCard key={item.id} item={item} column={i % 3} />
      ))}
    </div>
  );
}
