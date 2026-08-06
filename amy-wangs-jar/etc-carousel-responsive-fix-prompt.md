# Prompt: Make the `/etc/[category]` plate carousel responsive by construction

## Context

`app/etc/[category]/page.tsx` renders a curved "carousel" of photos arranged
on an arc around a decorative plate illustration (`components/Etc/PlateCircle.tsx`).
All positioning is hand-computed trigonometry — there is no flexbox/grid doing
this layout for you. The relevant pieces today:

- `computeLayout(viewportWidth, maxItemSize)` in `components/WhatsInside/layout.ts`
  solves `itemSize` from the **viewport width only** (so the arrow-to-arrow
  row never overflows horizontally), then derives `imageSize`, `spacing`, `gap`
  from it.
- `getArcSlot(offsetDeg, radius)` places each photo/arrow on a circle of
  radius `attachRadius` around a "hub" point.
- The plate is deliberately oversized and only partially shown — a wrapper
  around it (`overflow-hidden`, height `plateRadius + plateVisibleBelowHub`)
  crops off all but a `(1 - BLEED_FRACTION)` sliver of it.
- The whole assembly (photos + arrows + plate) is absolutely positioned and
  anchored near the bottom of a fixed-height `<section>` via
  `top: max(0px, calc(100% - areaHeight - BOTTOM_GAP_PX))`, and the section
  itself has `overflow-hidden`.
- A separate, independently-tuned `SIZE_HEIGHT_RATIO` constant tries to let
  `itemSize` grow past its normal ceiling (`MAX_ITEM_SIZE = 440`) when the
  viewport is tall, via `useViewportHeight()`.

## The actual problem

Width and height are being solved as two **separate, independently-tuned**
problems (`computeLayout`'s width solve, the height-based size ceiling, the
fixed-fraction plate crop, the clamped bottom-anchor position), and they
periodically disagree with each other. Symptoms already hit and fixed one at
a time, each patch risking un-fixing the last: photos clipping off-screen,
the plate showing an inconsistent amount of itself between screen sizes,
size increases having no visible effect, position responding "backwards."

**The fix is architectural, not another tuned constant**: stop solving width
and height separately. Treat the whole composition as one fixed-size
"design," and scale the *entire finished composition* by a single factor to
fit whatever space is actually available — the same technique used to fit an
SVG/logo into any container. Because everything (item spacing, arrow
position, plate size, and the plate's own crop line) scales together by
construction, nothing can drift out of sync with anything else again.

## What to build

1. **Freeze the design at one fixed size.** Compute `itemSize` (and
   everything derived from it — `imageSize`, `spacing`, `gap`, `plateSize`,
   `attachRadius`, `topReach`, `areaWidth`, `areaHeight`, arrow slots, etc.)
   using a **constant** design value (`MAX_ITEM_SIZE = 440`, today's desktop
   size) — not `computeLayout(viewportWidth)`. All of the existing arc/trig
   math (`getArcSlot`, `PLATE_SCALE`, `BLEED_FRACTION`, `PLATE_ITEM_GAP_RATIO`,
   `CENTER_SCALE`, `FAR_SCALE`, `NEIGHBOR_SCALE`, `ARROW_SIZE`) should be
   **left exactly as-is** — just no longer re-solved per viewport. This
   fixed-size box is the "design," always `areaWidth × areaHeight` px.

2. **Measure the real available space.** Use (or add) a hook that reports
   the actual box the composition needs to fit into — the section's own
   rendered width and height (e.g. `useElementSize` from `layout.ts`, or the
   section's `clientWidth`/`clientHeight` via `ResizeObserver`), not raw
   `window.innerWidth`/`innerHeight` — so header height, padding, etc. are
   automatically accounted for rather than approximated with a magic
   constant.

3. **Compute one scale factor:**
   ```js
   const scale = Math.min(
     availableWidth / designAreaWidth,
     availableHeight / designAreaHeight,
     MAX_SCALE // e.g. 1.4–1.6 — stop an ultrawide/very tall screen from making it comically huge
   );
   ```
   Do **not** floor this below some minimum without deciding on purpose
   whether a tiny phone should ever get smaller than legible — flag this as
   an open question rather than guessing (see "Decisions to confirm" below).

4. **Apply it as a single transform** on the outer wrapper that already
   contains the whole assembly:
   ```js
   style={{ transform: `scale(${scale})`, transformOrigin: "bottom center" }}
   ```
   `transformOrigin: bottom center` keeps the anchor point where the plate
   sits fixed while everything grows/shrinks around it — this should let you
   **delete** the current `top: max(0px, calc(...))` clamp hack entirely; a
   plain bottom-anchor (flex `items-end`/`justify-end`, or `bottom: 0` on an
   absolutely positioned wrapper) should now be sufficient, since the scaled
   box is guaranteed to fit by construction.

5. **Remove what this replaces**, once the above is confirmed working:
   - `computeLayout(viewportWidth, sizeCeiling)` call → replace with the
     fixed design constant.
   - `SIZE_HEIGHT_RATIO`, `SIZE_CEILING_MAX_PX`, `useViewportHeight()`'s use
     for sizing (the hook itself may still be useful for measuring available
     space in step 2, just not for a separate ratio-based ceiling).
   - `BOTTOM_GAP_PX` / the clamped `top: max(0px, calc(...))` positioning.
   - Confirm nothing else in the file (or `Carousel.tsx`, which shares
     `computeLayout`) depends on these before deleting.

## Decisions to confirm before/while implementing (don't guess silently)

- **Arrow tap targets**: today `ARROW_SIZE` (36px) is fixed regardless of
  screen — under uniform scaling it would shrink on a small phone along with
  everything else. Decide: is a smaller-but-proportional arrow acceptable,
  or does it need a scale-independent minimum tap target size (more complex —
  would need excluding arrows from the transform and repositioning them
  separately)?
- **`MAX_SCALE` ceiling**: pick a number, and sanity-check it against a very
  large/tall monitor so the composition doesn't become absurdly oversized.
- **Minimum scale floor**: should there be one, or is "whatever fits" always
  fine even on the smallest supported phone width?

## Verification (required before calling this done)

Do **not** declare this finished from math alone — this exact page has
already had multiple "the math says it's fine" fixes turn out wrong once
actually viewed. Check, live, at minimum:

- The two real test sizes already gathered this round: `window.innerHeight`
  772px ("small") and 1012px ("big") — confirm the composition now reads as
  **proportionally consistent** between them (same relative amount of plate
  visible, same relative fill of the screen), not just "doesn't crash."
- A narrow phone width (e.g. ~375px) — confirm arrows and photos are never
  clipped and remain tappable.
- A very short, very wide window (e.g. landscape phone) and a very tall,
  narrow window — the two axes should now scale together, so neither extreme
  should look broken.
- Resize the window live (don't just reload at fixed sizes) and confirm it
  scales smoothly with no snapping/flicker.

## Process constraints (hard-won from this exact feature)

- Implement this as its own isolated change. Don't combine it with unrelated
  tweaks — if something looks off afterward, it should be obvious what
  caused it.
- Verify visually at each meaningful step rather than stacking multiple
  unverified changes on top of each other.
- If a formula-level prediction (e.g. "this should now scale to ~X px") is
  about to be reported as fixed, sanity-check it with a quick calculation
  first (as was done — and caught a real bug — earlier in this exact effort)
  before telling the user it's done.
