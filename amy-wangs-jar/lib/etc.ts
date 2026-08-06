export type EtcCategorySlug = "drawing" | "nails" | "dancing" | "content";

export type EtcCategoryInfo = {
  slug: EtcCategorySlug;
  label: string;
};

export type EtcPhoto = {
  src: string;
  caption: string;
  width: number; // intrinsic pixel size, used to lay photos out at their own aspect ratio
  height: number;
};

export const ETC_CATEGORIES: EtcCategoryInfo[] = [
  { slug: "drawing", label: "Drawing" },
  { slug: "nails", label: "Nails" },
  { slug: "dancing", label: "Dancing" },
  { slug: "content", label: "Content" },
];

// First-draft captions — edit freely, these just describe what's actually in
// each photo. Nails/Content are empty until there are photos to add.
export const ETC_PHOTOS: Record<EtcCategorySlug, EtcPhoto[]> = {
  drawing: [
    { src: "/images/etc/drawing1.png", caption: "Niu Zaizai - 2023.", width: 808, height: 1076 },
    { src: "/images/etc/drawing2.png", caption: "Jo Yuri (Squid Games) - 2025.", width: 888, height: 896 },
    { src: "/images/etc/drawing3.png", caption: "Cha Woongki (AHOF) - 2023.", width: 812, height: 824 },
    { src: "/images/etc/drawing4.png", caption: "Chihen (WIP, AHOF) - 2026.", width: 716, height: 892 },
  ],
  nails: [],
  dancing: [
    { src: "/images/etc/dance1.png", caption: "Curtain call after a group recital.", width: 1192, height: 892 },
    { src: "/images/etc/dance2.png", caption: "Chinese classical dance performance.", width: 892, height: 668 },
    { src: "/images/etc/dance3.png", caption: "Korean traditional hanbok dance.", width: 756, height: 1136 },
    { src: "/images/etc/dance4.png", caption: "Fan dance in blue stage light.", width: 1160, height: 772 },
    { src: "/images/etc/dance5.png", caption: "Extension into an arabesque.", width: 992, height: 660 },
    { src: "/images/etc/dance6.png", caption: "Backstage at the Abstract Dance Challenge.", width: 704, height: 936 },
    { src: "/images/etc/dance7.png", caption: "Fan in hand, between poses.", width: 872, height: 580 },
  ],
  content: [],
};
