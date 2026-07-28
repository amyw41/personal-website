// Single source of truth for Amy's social links — consumed by both the icon
// column (SocialColumn) and the footer's text row (Footer), which previously
// carried two separate, drifted copies of the same URLs.
export const SOCIAL_LINKS = [
  {
    id: "linkedin",
    label: "LinkedIn",
    footerLabel: "Linkedin",
    href: "https://www.linkedin.com/in/amyw41/",
    icon: "/images/logos/linkedin.png",
    inFooter: true,
  },
  {
    id: "email",
    label: "Email",
    href: "mailto:amy.wang1@uwaterloo.ca",
    icon: "/images/logos/gmail.png",
    inFooter: true,
  },
  {
    id: "tiktok",
    label: "TikTok",
    href: "https://www.tiktok.com/@amyb3rrie",
    icon: "/images/logos/tiktok.png",
  },
  {
    id: "x",
    label: "X",
    footerLabel: "X / Twitter",
    href: "https://x.com/apriberri",
    icon: "/images/logos/twitter.png",
    inFooter: true,
  },
];
