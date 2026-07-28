export type EtcCategorySlug = "drawing" | "nails" | "dancing" | "content";

export type EtcCategoryInfo = {
  slug: EtcCategorySlug;
  label: string;
};

export type EtcPhoto = {
  src: string;
  caption: string;
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
    { src: "/images/etc/drawing1.png", caption: "Graphite portrait on a cow-print background." },
    { src: "/images/etc/drawing2.png", caption: "Reference photo next to the finished sketch." },
    { src: "/images/etc/drawing3.png", caption: "Colored pencil self-portrait with a disposable camera." },
    { src: "/images/etc/drawing4.png", caption: "Digital portrait study in blue." },
  ],
  nails: [],
  dancing: [
    { src: "/images/etc/dance1.png", caption: "Curtain call after a group recital." },
    { src: "/images/etc/dance2.png", caption: "Chinese classical dance performance." },
    { src: "/images/etc/dance3.png", caption: "Korean traditional hanbok dance." },
    { src: "/images/etc/dance4.png", caption: "Fan dance in blue stage light." },
    { src: "/images/etc/dance5.png", caption: "Extension into an arabesque." },
    { src: "/images/etc/dance6.png", caption: "Backstage at the Abstract Dance Challenge." },
    { src: "/images/etc/dance7.png", caption: "Fan in hand, between poses." },
  ],
  content: [],
};
