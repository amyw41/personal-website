import Image from "next/image";
import { SOCIAL_LINKS } from "@/lib/social";

function SocialIcon({ social }) {
  return (
    <Image
      src={social.icon}
      alt={social.label}
      width={34}
      height={34}
      className="h-[34px] w-[34px] object-contain transition-transform duration-150 hover:scale-102"
    />
  );
}

export default function SocialColumn() {
  return (
    <div
      // Fixed px inset from the right edge rather than pct()'s left-based
      // percentage — left:pct(1433) scaled with viewport width, so anywhere
      // between the md breakpoint (768px) and ~919px it pushed this column
      // partly off the right edge of the screen instead of staying pinned a
      // constant distance from it. Absolute (not fixed) so it scrolls away
      // with the home page's own content instead of staying pinned to the
      // viewport as the user scrolls down.
      className="absolute z-40 hidden flex-col overflow-hidden rounded-[5px] border border-[#D9D9D9] bg-[#F2F2F2] md:flex"
      style={{ right: 79, top: 95 }}
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
