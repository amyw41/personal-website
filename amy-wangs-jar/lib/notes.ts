// Bulletin-board layout constants + placeholder sticky-note data for the
// /notes page. No backend — this is all in-memory, generated once at
// module load and shared by BulletinBoard (the pan/zoom viewport) and
// StickyNote (drag + clamp math), so both agree on the same coordinate
// space without duplicating numbers.

// Native pixel size of public/images/drawings/bulletin-board.png. The
// "world" layer in BulletinBoard is sized to exactly this, unscaled — every
// xPct/yPct below (and every note's own width/height) is a percentage of,
// or a literal pixel count within, this same space. Zooming is then just a
// CSS transform: scale() on that whole layer, so nothing has to be
// recomputed when the zoom level changes.
export const BOARD_WIDTH = 5300;
export const BOARD_HEIGHT = 3136;

// The inner rectangle where content can sit without visually crossing the
// board's drawn frame lines. Pixel-measured off the source PNG via
// mid-edge scanlines (x: 2.6%-97.0%, y: 6.2%-94.6%), then pulled in further
// on each axis — the corners are mitered/diagonal, so anything placed near
// a corner needs more inset than a mid-edge measurement alone would give.
export const SAFE_AREA = { xMin: 6.5, xMax: 93.5, yMin: 10, yMax: 90.5 };

export type StickyNoteData = {
  id: string;
  xPct: number;
  yPct: number;
  rotation: number;
  color: string;
  text: string;
  width: number;
  height: number;
};

// Pastel sticky-note palette — swap `color` for a real photo `src` later
// without touching any positioning logic.
const COLORS = ["#FFF3A0", "#FFD3E2", "#C9F2C7", "#BEE3F8", "#FFD9AE", "#E6D6FF"];

// Placeholder "random thought" text — stands in for real note photos.
const PLACEHOLDER_TEXTS = [
  "remember to water the plants",
  "new video idea??",
  "call mom back",
  "3am thought: are we the fish",
  "reply to emails!!",
  "grocery list on the fridge",
  "what if i learned to skate",
  "song stuck in my head",
  "finish that sketch",
  "quote i liked today",
  "plan the trip",
  "read more this year",
  "note to self: breathe",
  "random idea, don't lose it",
  "draft: a poem about nothing",
];

// Deterministic PRNG (mulberry32) — the note scatter below is computed once
// at module load, which happens on both the server render and the client
// hydration pass. Math.random() would return different values each time
// and trip a hydration mismatch; seeding the generator makes both passes
// produce the identical layout instead.
function mulberry32(seed: number) {
  let state = seed;
  return function () {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Clamps a note's center position so its edges stay within SAFE_AREA,
// accounting for the note's own size (a wide note can't get as close to
// xMin/xMax as a narrow one before it would visually cross the frame).
// Used both at initial scatter time and on every pointer-move while a note
// is being dragged.
export function clampToSafeArea(xPct: number, yPct: number, width: number, height: number) {
  const halfWPct = ((width / 2) / BOARD_WIDTH) * 100;
  const halfHPct = ((height / 2) / BOARD_HEIGHT) * 100;
  const xMin = Math.min(SAFE_AREA.xMin + halfWPct, SAFE_AREA.xMax - halfWPct);
  const xMax = Math.max(SAFE_AREA.xMin + halfWPct, SAFE_AREA.xMax - halfWPct);
  const yMin = Math.min(SAFE_AREA.yMin + halfHPct, SAFE_AREA.yMax - halfHPct);
  const yMax = Math.max(SAFE_AREA.yMin + halfHPct, SAFE_AREA.yMax - halfHPct);
  return {
    xPct: Math.min(Math.max(xPct, xMin), xMax),
    yPct: Math.min(Math.max(yPct, yMin), yMax),
  };
}

export function generateStickyNotes(count: number, seed = 12345): StickyNoteData[] {
  const rand = mulberry32(seed);
  const notes: StickyNoteData[] = [];
  for (let i = 0; i < count; i++) {
    const width = Math.round(320 + rand() * 100); // 320-420 world px
    const height = Math.round(300 + rand() * 90); // 300-390 world px
    const raw = clampToSafeArea(
      SAFE_AREA.xMin + rand() * (SAFE_AREA.xMax - SAFE_AREA.xMin),
      SAFE_AREA.yMin + rand() * (SAFE_AREA.yMax - SAFE_AREA.yMin),
      width,
      height
    );
    notes.push({
      id: `note-${i}`,
      xPct: raw.xPct,
      yPct: raw.yPct,
      rotation: Math.round((-8 + rand() * 16) * 10) / 10,
      color: COLORS[Math.floor(rand() * COLORS.length)],
      text: PLACEHOLDER_TEXTS[i % PLACEHOLDER_TEXTS.length],
      width,
      height,
    });
  }
  return notes;
}
