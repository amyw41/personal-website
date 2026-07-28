import Image from "next/image";
import { pct } from "@/lib/frame";
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
