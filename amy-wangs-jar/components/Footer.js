// Horizontal positions are percentages of a 1512px reference frame (the design's
// desktop canvas) so the layout scales proportionally at any viewport width instead
// of being pinned to literal px. Vertical offsets stay literal since they're small
// positions inside fixed-height bars, not values meant to stretch with width.
const FRAME_WIDTH = 1512;
const pct = (x) => `${((x / FRAME_WIDTH) * 100).toFixed(3)}%`;

const REPEAT_COUNT = 8;

// TODO: swap these "#" placeholders for Amy's real social profile URLs.
const SOCIAL_TEXT_LINKS = [
  { label: "Linkedin", href: "#" },
  { label: "Email", href: "#" },
  { label: "X / Twitter", href: "#" },
];

function MarqueeGroup({ ariaHidden }) {
  return (
    <div className="flex shrink-0 items-center" aria-hidden={ariaHidden}>
      {Array.from({ length: REPEAT_COUNT }).map((_, i) => (
        <span
          key={i}
          className="whitespace-nowrap px-10 font-singsong text-[80px] font-bold leading-none text-white sm:text-[120px] lg:text-[160px]"
        >
          THANKS FOR VISITING
        </span>
      ))}
    </div>
  );
}

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto w-full">
      <div className="relative h-[350px] w-full overflow-hidden bg-[#2460A4]">
        <div
          className="absolute flex items-center gap-3 whitespace-nowrap font-roboto text-base text-white"
          style={{ left: pct(29), top: 34 }}
        >
          {SOCIAL_TEXT_LINKS.map((social, i) => (
            <span key={social.label} className="flex items-center gap-3">
              <a href={social.href} target="_blank" rel="noopener noreferrer" className="hover:underline">
                {social.label}
              </a>
              {i < SOCIAL_TEXT_LINKS.length - 1 && <span aria-hidden="true">•</span>}
            </span>
          ))}
        </div>

        <div className="absolute flex w-max animate-marquee" style={{ top: 55 }}>
          <MarqueeGroup />
          <MarqueeGroup ariaHidden="true" />
        </div>
      </div>

      <div className="relative h-11 w-full bg-black">
        <p
          className="absolute whitespace-nowrap font-roboto text-sm text-white"
          style={{ left: pct(29), top: 11 }}
        >
          Designed + coded by Amy (© 2026)
        </p>
        <a
          href="https://amywang.framer.website"
          target="_blank"
          rel="noopener noreferrer"
          className="absolute whitespace-nowrap font-roboto text-sm text-white hover:underline"
          style={{ left: pct(1223), top: 11 }}
        >
          Looking for my portfolio?
        </a>
      </div>
    </footer>
  );
}
