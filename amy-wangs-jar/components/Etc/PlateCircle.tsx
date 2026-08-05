import Image from "next/image";

// "Plate" circle used both small (overview grid) and large (detail page,
// centered) — a hand-drawn plate illustration with the category name
// centered inside. Purely decorative/presentational aside from the image
// itself, so it renders fine from either a Server or Client Component.
export default function PlateCircle({
  label,
  size = 220,
  className = "",
}: {
  label: string;
  size?: number;
  className?: string;
}) {
  return (
    <div
      className={`pointer-events-none relative flex items-center justify-center text-gray-600 ${className}`}
      style={{ width: size, height: size }}
    >
      <Image
        src="/images/drawings/plate-1.png"
        alt=""
        fill
        priority
        sizes={`${Math.round(size)}px`}
        // Rotated 180° — the source drawing's pen strokes don't fully close
        // near the top (a visible gap in both rings, plus a stray tail
        // mark), while the bottom is clean. Flipping it moves that gap to
        // the bottom, which the detail page's bleed-clip crops away anyway.
        className="rotate-180 object-contain"
      />
      <span className="relative px-4 font-instrument" style={{ fontSize: size * 0.1 }}>
        {label}
      </span>
    </div>
  );
}
