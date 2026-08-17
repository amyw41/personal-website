import { EXPERIENCE, type ExperienceEntry } from "@/lib/experience";
import FadeImage from "@/components/FadeImage";

// Replaces the old Carousel view (see WhatsInside/index.tsx) — that showed
// the same creative PORTFOLIO_PROJECTS as Gallery, just spinning; this is
// real work/community history instead, which reads better as a plain list
// than as a wheel. Wrapped in the same hand-drawn border.png frame the
// About page uses for its bio text, so the two "read about Amy" surfaces
// (About's bio, this) share a visual language.
function ExperienceRow({ entry }: { entry: ExperienceEntry }) {
  return (
    <div className="flex items-center gap-4 py-3">
      {/* Fixed square, not `fill`-to-row-height — logos come in whatever
          aspect ratio each company's own brand mark is (square icon vs.
          wide wordmark), so object-contain inside a fixed box is what
          keeps every one the same visual weight in the list regardless of
          its native shape. rounded-[5px] (slight rounding, not full
          circle) + no border — softens the square without turning it into
          an avatar-style badge, and at this size doesn't need an outline
          to read as its own distinct shape against the page. */}
      <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-[5px] bg-white">
        <FadeImage
          src={entry.logo}
          alt={`${entry.company} logo`}
          fill
          sizes="64px"
          unoptimized={process.env.NODE_ENV !== "production"}
          className="object-contain"
        />
      </div>
      <div className="text-left">
        <p className="font-body text-lg text-black/90">
          <span className="font-medium">{entry.company}</span>{" "}
          <span className="text-black/60">— {entry.title}</span>
        </p>
        <p className="font-body text-base font-light text-black/50">{entry.date}</p>
      </div>
    </div>
  );
}

export default function Experience() {
  return (
    // mx-auto w-full max-w-[760px] — About's own border-wrapped text column
    // is sized by its parent grid there (minmax(320px,1fr)); this isn't in
    // a grid, so it needs an explicit width instead. Bigger than About's
    // ~640px text column on purpose — this frame is the whole view (no
    // heading/copy beside it eating width), so it can afford to read
    // larger/more prominent. sizes/p- bumped to match.
    <div className="relative mx-auto w-full max-w-[760px] p-12 text-left sm:p-16">
      <FadeImage
        src="/images/drawings/border.png"
        alt=""
        fill
        // No `sizes` prop — deliberately, matching jar.png's own (accidental,
        // but proven-good-looking) treatment in Jar.js. A `sizes` value here
        // told next/image + the browser this box only ever needs a
        // ~760px-wide source, so it was correctly fetching one that small —
        // but this thin hand-drawn linework visibly pixelates once actually
        // stretched back out to real size at any real zoom/DPR, in a way
        // bumping `quality` alone never fixed (that only softens compression
        // artifacts, this is genuine under-resolution). Omitting `sizes`
        // defaults next/image to assuming the image could need full-viewport
        // width, so it always fetches a much bigger source than this box
        // actually needs — wasteful, but the only way this specific asset
        // reliably looks sharp at any zoom.
        quality={95}
        unoptimized={process.env.NODE_ENV !== "production"}
        className="pointer-events-none object-fill"
      />
      <div className="relative">
        {EXPERIENCE.map((group) => (
          <div key={group.label} className="mt-10 first:mt-0">
            <h3 className="font-instrument text-[28px] text-black/80">{group.label}</h3>
            <div className="mt-1 divide-y divide-gray-100">
              {group.entries.map((entry) => (
                <ExperienceRow key={entry.company} entry={entry} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
