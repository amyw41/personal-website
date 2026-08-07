# Prompt: Build the `/notes` page (bulletin board of random thoughts)

## Context

`app/notes/page.js` is currently an empty stub (`<div />`). The "Notes" nav
link already points at it (`components/Taskbar.js`). No backend exists in
this project and none should be added — this page is a single bulletin-board
view.

The bulletin board artwork already exists at
`public/images/drawings/bulletin-board.png` (5300×3136px, transparent PNG —
a hand-drawn frame, two nested rectangles with mitered corners, no cork
texture drawn in yet). No sticky-note photos exist yet — use placeholders
(solid-color boxes or a simple CSS sticky-note look, plus lorem-ish
placeholder text) positioned/sized so real photos can drop in later without
restructuring the layout.

Reference the existing `/etc` page (`app/etc/page.tsx`) for house style —
`font-singsong` for the big handwritten heading, `#2460A4` heading color,
`font-roboto font-light text-gray-500` for the subtitle, `pt-20 pb-36`
section padding, `text-center`.

## Decided (confirmed with Amy — don't re-litigate these)

- **Title placement:**
  - **"Bulletin Board"** is the page's own heading, positioned the same way
    `/etc`'s `<h1>` ("What's on my plate?") sits — outside/above the artwork,
    top of page, centered.
  - **"Welcome to my mind"** sits *inside* the board itself (overlaid on the
    artwork, like a note pinned to the cork), set in `font-singsong` — the
    same font used for `/etc`'s `<h1>`.
- **Sticky notes are placed fully randomly** across the board — no grouping,
  no sections. (Amy considered a divider-based layout and ruled it out in
  favor of random.)
- Board must support **pan (drag) and zoom (scroll in/out)** so all notes
  are reachable even though the board image is much larger than the
  viewport — this is a page-specific interaction, not the same "fixed
  poster + horizontal scrollbar" approach `/etc` uses.
- **The board's outer frame/border is the only frozen element** — it defines
  the fixed viewport window you're looking through. Everything inside it
  (the cork surface, "Welcome to my mind," every sticky note) pans and zooms
  together as one layer.
- **Sticky notes should also be individually draggable**, if it's not too
  complicated — on top of the board itself being pannable, the user should
  be able to pick up and reposition any single note within the board. This
  is in-session only (no backend), so dragged positions reset on reload —
  that's expected, not a gap to fix.
- **Notes should read as physically sitting on top of the board, not flat
  in it** — a soft `box-shadow` under each note is enough to sell this (no
  real 3D/perspective needed). While a note is actively being dragged, grow
  the shadow and/or nudge it slightly larger (e.g. `scale(1.05)`) to read as
  "lifted off the cork," then settle back to its resting shadow on drop —
  same visual idea as dragging a card in Trello/Miro.
- **Interaction model** (standard whiteboard/canvas convention — this is
  what makes it intuitive rather than a novel scheme to learn):
  pointer-down on empty cork → pans the board. Pointer-down on a note →
  moves that note, board does not pan. Scroll-wheel/pinch, anywhere → zooms.
  This only works if a note's drag handler stops its pointer event from
  reaching the board's pan handler (see implementation note in step 3).
- **Dragged notes are clamped inside the safe area** (can't be pulled under
  the frame border) — leaving them free would let a note visually vanish
  behind the border, which reads as broken rather than playful. Clamping is
  the safer default; revisit only if it feels too restrictive once built.
- **A note picked up for dragging jumps to the top `z-index`** for the
  duration of the drag — needed for the "lifted up" feel to read correctly
  when notes overlap; without it a lifted note can appear to move *behind*
  a neighboring note it passes over.

## Content-safe area inside the board

The board PNG is a drawn frame, not a filled corkboard — pixel-measured
against the 5300×3136 source, the **inner rectangle** (where a note should
never visually cross the frame lines) is approximately:

- **x:** 2.6% → 97.0% of the image width
- **y:** 6.2% → 94.6% of the image height

(Measured via mid-edge scanlines, not the corners — the corners are
mitered/diagonal, so notes placed near a corner need a bit more inset than
the numbers above, maybe 4–5% margin on each axis instead of the flat
numbers.) Treat these as a starting estimate, not gospel — pull up the image
at actual size next to the built page and eyeball whether any note appears
to sit on or outside the drawn line, and nudge the safe-area margins if so.

## What to build

1. **Page heading**, positioned like `/etc`'s heading block:
   ```
   <h1 class="font-singsong text-[clamp(2rem,6vw,3.5rem)] text-[#2460A4]">Bulletin Board</h1>
   ```
   (subtitle under it is optional — `/etc` has one, decide if this page
   needs one too, see open decisions below).

2. **A pan/zoom viewport** below the heading containing the board image at
   (or near) its native resolution, with sticky notes absolutely positioned
   over it in the *same percentage coordinate space* used elsewhere in this
   repo (see `GALLERY` in `app/etc/page.tsx` for the `xPct`/`yPct` pattern —
   reuse that convention here instead of inventing a new one).
   - Panning: scroll/drag within a fixed-size, `overflow: auto` (or a
     drag-to-pan library) container.
   - Zooming: a scale transform on the board+notes wrapper, with either
     on-screen +/- buttons, scroll-wheel/pinch, or both. A library like
     `react-zoom-pan-pinch` is a reasonable option if hand-rolling pan+zoom
     gets fiddly — flag which approach you're taking rather than silently
     picking one, since it affects mobile touch behavior.
   - "Welcome to my mind" text is one of the elements positioned on the
     board (in board-percentage coordinates, `font-singsong`), not part of
     the outer page heading.

3. **Placeholder sticky notes** — a small component (e.g.
   `components/Notes/StickyNote.tsx`) that renders a rotated, randomly
   colored/tinted box with placeholder text, sized/positioned to later swap
   `background` or an `<Image>` for a real sticky-note photo without
   changing the positioning logic. Scatter a reasonable placeholder count
   (10–15) at random `xPct`/`yPct` within the safe area above, each with a
   small random rotation (e.g. -8° to 8°) so they read as scattered/organic
   rather than grid-aligned. Give each a resting `box-shadow` (see "reads as
   physically sitting on top" above) so it visually separates from the cork
   even before any dragging happens.

   Each note holds its **own** position in component state (initialized
   from its random `xPct`/`yPct`, clamped to the safe area) and exposes a
   drag handler that:
   - calls `stopPropagation`/scopes its own `onPointerDown` so the event
     never reaches the board's pan handler (this is *the* thing that makes
     "drag board" vs "drag note" work safely — get this wrong and the two
     gestures fight each other),
   - clamps the note's new position to the safe area on every move, not
     just on drop,
   - bumps the note to the top `z-index` and applies the "lifted" shadow/
     scale for the duration of the drag, reverting both on release.

4. **The horizontal line** Amy mentioned ("just a straight regular line of
   light weight") — see open decision below on whether it's still wanted
   now that notes are fully random rather than split into sections.

## Decisions to confirm before/while implementing (don't guess silently)

- **Does the horizontal divider line still belong on the page?** It was
  originally floated alongside a two-section layout idea that's now been
  dropped in favor of full random scatter — confirm with Amy whether it's
  still wanted as a purely decorative line on the board, or should be
  dropped.
- **Subtitle under "Bulletin Board":** `/etc` pairs its `<h1>` with a
  `font-roboto` subtitle line. Does this page want one too, or does "Welcome
  to my mind" (inside the board) already serve that role?
- **Zoom range & default zoom level:** what min/max scale, and should the
  page load already zoomed to fit the whole board, or zoomed to 100%
  requiring the user to zoom out?
- **Mobile behavior:** pinch-zoom + drag-pan is the natural mobile
  equivalent — confirm this should work with touch, not just mouse/scroll.
  Safety note either way: set `touch-action: none` on the board viewport (or
  the pan/zoom library's equivalent) so touch-dragging inside the board
  doesn't also scroll the page underneath it — a common "feels broken"
  mobile bug on canvas/whiteboard UIs if left at the default.
- **Placeholder note sizing/count:** the 10–15 count and size range above
  are a starting guess — check it doesn't read as too sparse or too crowded
  once actually rendered on the board at a normal zoom level.

## Verification (required before calling this done)

- Load the page and confirm the board fills the available viewport
  sensibly (not comically tiny, not so huge it's mostly cropped on load).
- Pan to all four corners and confirm every placeholder note is fully
  inside the drawn frame — none clipped by or overlapping the border line.
- Zoom in and out across the full supported range — confirm notes and the
  "Welcome to my mind" text scale together with the board (nothing detaches
  or misaligns at extreme zoom).
- Resize the browser window and reload at a few widths — confirm the
  pan/zoom container itself resizes sensibly rather than clipping oddly.
- Test on a touch device or touch emulation if pinch/drag-pan was
  implemented — confirm it doesn't fight the page's own scroll.
- Drag an individual note and confirm the **board itself doesn't pan** at
  the same time — the two gestures (drag-a-note vs drag-the-board) must be
  cleanly distinguishable depending on where the pointer-down starts.
- Drag a note near/over another note and confirm it doesn't get stuck
  underneath — check the z-index behavior decided above actually works.
- Pick up a note and confirm it visually "lifts" (shadow/scale change) and
  settles back down on release — and that dragging it to the frame edge
  stops at the safe-area boundary instead of sliding under the border.

## Process constraints

- No backend — don't add API routes, forms, or persistence.
- Don't touch `/etc` or the home page while building this — if the pan/zoom
  approach here turns out to be reusable there later, that's a separate,
  deliberate follow-up, not a byproduct of this change.
- Verify visually at each meaningful step (heading placement, board
  sizing, note scatter, pan, zoom) rather than stacking several unverified
  pieces before looking at it once.
