export type WhatsInsideItem = {
  id: string;
  name: string;
  image: string;
  // Hex accent used as the card/background highlight — chosen to complement
  // the item's own colors, not just alternated for variety.
  accent: string;
  description: string;
};

// Order matches the 3x3 grid in public/references/jar-gallery.png (left to
// right, top to bottom) so Gallery needs no re-sorting to match the wireframe.
export const WHATS_INSIDE_ITEMS: WhatsInsideItem[] = [
  {
    id: "ballet",
    name: "Ballet Shoes",
    image: "/images/items/ballet.png",
    accent: "#F5D8DE",
    description: "I've been dancing since I was 4. I'm currently relearning ballet pointe.",
  },
  {
    id: "kitty-mirror",
    name: "Hello Kitty Mirror",
    image: "/images/items/kitty-mirror.png",
    accent: "#FF6FA0",
    description: "The mirror I use to film content.",
  },
  {
    id: "laneige",
    name: "Laneige Lip Balm",
    image: "/images/items/laneige.png",
    accent: "#DCEEDD",
    description: "I don't go anywhere without lip balm. This is matcha flavored.",
  },
  {
    id: "chips",
    name: "Turtle Chips",
    image: "/images/items/chips.png",
    accent: "#D9B48F",
    description: "Fav snack ever.",
  },
  {
    id: "bingsu",
    name: "Bingsu",
    image: "/images/items/bingsu.png",
    accent: "#F0E9DE",
    description: "I have a massive sweet tooth. I can eat 4 large bingsus on my own. (I think)",
  },
  {
    id: "pineapple",
    name: "Pineapple Soda",
    image: "/images/items/pineapple.png",
    accent: "#FBE07A",
    description: "Fav drink!!!",
  },
  {
    id: "kitty-plush",
    name: "Hello Kitty Plush",
    image: "/images/items/kitty-plush.png",
    accent: "#FF9EC4",
    description: "I'm kind of good at games I won this at a carnival first try.",
  },
  {
    id: "hufflepuff",
    name: "Hufflepuff Patch",
    image: "/images/items/hufflepuff.png",
    accent: "#E8C15A",
    description: "I know every piece of Harry Potter lore. I'm a Hufflepuff!",
  },
  {
    id: "bottle",
    name: "Water Bottle",
    image: "/images/items/bottle.png",
    accent: "#FFD1E3",
    description: "Best investment ever, I drink like 10 bottles of water a day now.",
  },
  {
    id: "skullpanda",
    name: "Skullpanda Charm",
    image: "/images/items/skullpanda.png",
    accent: "#BFE0F0",
    description: "I like MLP and Skullpandas. Dash is my fav.",
  },
  {
    id: "digi",
    name: "Digital Camera",
    image: "/images/items/digi.png",
    accent: "#F7DCE3",
    description: "As obsessed with taking digi pics as the girl next door.",
  },
  {
    id: "handcream",
    name: "Hand Cream",
    image: "/images/items/handcream.png",
    accent: "#E3E8EE",
    description: "I have the driest hands ever.",
  },
];
