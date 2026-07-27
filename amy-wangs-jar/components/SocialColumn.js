import Image from "next/image";

// Horizontal position is a percentage of a 1512px reference frame — see Footer.js
// for why (scales proportionally instead of pinning to literal px).
const FRAME_WIDTH = 1512;
const pct = (x) => `${((x / FRAME_WIDTH) * 100).toFixed(3)}%`;

// TODO: swap these "#" placeholders for Amy's real social profile URLs.
const SOCIAL_LINKS = [
  { label: "LinkedIn", href: "https://www.linkedin.com/in/amyw41/", src: "/images/linkedin.png" },
  { label: "Email", href: "mailto:amy.wang1@uwaterloo.ca", src: "/images/gmail.png" },
  { label: "TikTok", href: "https://www.tiktok.com/@amyb3rrie", src: null },
  { label: "X", href: "https://x.com/apriberri", src: "/images/twitter.png" },
];

function TikTokIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M16.6 5.82c-.9-.98-1.4-2.26-1.4-3.6h-3.2v13.44c0 1.5-1.22 2.72-2.72 2.72a2.72 2.72 0 0 1 0-5.44c.28 0 .55.04.8.12V9.86a6 6 0 0 0-.8-.06 5.98 5.98 0 1 0 5.98 5.98V8.36a8.2 8.2 0 0 0 4.72 1.5v-3.2a4.85 4.85 0 0 1-3.38-1.84Z" />
    </svg>
  );
}

function SocialIcon({ social }) {
  if (social.src) {
    return (
      <Image
        src={social.src}
        alt={social.label}
        width={34}
        height={34}
        className="h-[34px] w-[34px] object-contain"
      />
    );
  }
  return <TikTokIcon className="h-[34px] w-[34px]" />;
}

export default function SocialColumn() {
  return (
    <div
      className="fixed z-40 hidden flex-col overflow-hidden rounded-[5px] border border-[#D9D9D9] bg-[#F2F2F2] md:flex"
      style={{ left: pct(1433), top: 95 }}
    >
      {SOCIAL_LINKS.map((social, i) => (
        <a
          key={social.label}
          href={social.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={social.label}
          className={`flex h-12 w-12 items-center justify-center text-gray-500 transition-colors hover:text-gray-800 ${i < SOCIAL_LINKS.length - 1 ? "border-b border-[#D9D9D9]" : ""
            }`}
        >
          <SocialIcon social={social} />
        </a>
      ))}
    </div>
  );
}
