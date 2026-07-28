// Outline "plate" circle used both small (overview grid) and large (detail
// page, centered) — a double ring with evenly spaced rivet marks around the
// rim, and the category name centered inside. Purely decorative/presentational
// (no hooks), so it renders fine from either a Server or Client Component.
const RIVET_COUNT = 10;

export default function PlateCircle({
  label,
  size = 220,
  className = "",
}: {
  label: string;
  size?: number;
  className?: string;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2 - 3;
  const innerR = outerR - 5;
  const rivetR = (outerR + innerR) / 2;

  const rivets = Array.from({ length: RIVET_COUNT }, (_, i) => {
    const angle = (i / RIVET_COUNT) * Math.PI * 2 - Math.PI / 2;
    return { x: cx + Math.cos(angle) * rivetR, y: cy + Math.sin(angle) * rivetR };
  });

  return (
    <div
      className={`pointer-events-none flex items-center justify-center text-gray-600 ${className}`}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="absolute" aria-hidden="true">
        <circle cx={cx} cy={cy} r={outerR} fill="none" stroke="currentColor" strokeWidth={1} opacity={0.5} />
        <circle cx={cx} cy={cy} r={innerR} fill="none" stroke="currentColor" strokeWidth={1} opacity={0.5} />
        {rivets.map((r, i) => (
          <circle key={i} cx={r.x} cy={r.y} r={2.5} fill="none" stroke="currentColor" strokeWidth={1} opacity={0.5} />
        ))}
      </svg>
      <span className="relative px-4 font-instrument" style={{ fontSize: size * 0.1 }}>
        {label}
      </span>
    </div>
  );
}
