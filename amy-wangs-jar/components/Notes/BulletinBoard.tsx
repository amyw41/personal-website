"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import StickyNote from "./StickyNote";
import { BOARD_WIDTH, BOARD_HEIGHT, SAFE_AREA, generateStickyNotes } from "@/lib/notes";

const NOTE_COUNT = 13;
// Generated once at module load (not per-render) with a fixed seed — see
// lib/notes.ts for why this needs to be deterministic rather than
// Math.random().
const NOTES = generateStickyNotes(NOTE_COUNT);

// How much bigger than "fit the whole safe area in the viewport" the fixed
// starting scale is — 2 means notes render at 2x that baseline size, with
// the extra half now off-screen on each axis reachable only by dragging.
// There's no zoom control to change this at runtime; tune this constant
// and reload to try a different starting scale.
const INITIAL_ZOOM = 3.8;

// Safe-area rectangle, in the same pixel space as BOARD_WIDTH/BOARD_HEIGHT
// (i.e. the "world" the pannable layer lives in). Computed once here so
// fitToViewport/clampTranslate don't recompute it on every call.
const SAFE_LEFT_PX = (BOARD_WIDTH * SAFE_AREA.xMin) / 100;
const SAFE_TOP_PX = (BOARD_HEIGHT * SAFE_AREA.yMin) / 100;
const SAFE_WIDTH_PX = (BOARD_WIDTH * (SAFE_AREA.xMax - SAFE_AREA.xMin)) / 100;
const SAFE_HEIGHT_PX = (BOARD_HEIGHT * (SAFE_AREA.yMax - SAFE_AREA.yMin)) / 100;

type Point = { x: number; y: number };

// Pan-only board (no zoom), built from three stacked layers so the drawn
// frame can never be panned along with the content, and content can never
// be panned past the frame's own INNER line:
//
// 1. `frameRef` — sized (via boardBox, below) to the bulletin-board PNG's
//    exact aspect ratio. Hosts the frame artwork at full size, unclipped —
//    this is the fixed "outside" the user never moves.
// 2. `viewportRef` — absolutely positioned *inside* frameRef at the
//    SAFE_AREA percentages (lib/notes.ts), with its own overflow-hidden.
//    This is the real pan viewport: every fit/clamp/pointer calculation
//    below measures and clips against THIS box, not frameRef, so panned
//    content is clipped at the frame's inner line, never the outer edge of
//    the image. "Welcome to my mind" is a direct child of this box too —
//    positioned in on-screen percentages, not world coordinates — so it
//    stays put ("sticky") no matter how far the notes underneath are
//    panned or dragged.
// 3. The pannable "world" div inside it, holding only the sticky notes —
//    unchanged in its own coordinate space (still the full BOARD_WIDTH ×
//    BOARD_HEIGHT that every note's xPct/yPct is relative to).
//
// The scale that fits the safe area into the viewport is computed once on
// mount/resize (fitToViewport) and then held fixed — there's no scroll-
// wheel or pinch zoom, only drag-to-pan.
export default function BulletinBoard() {
  // Outermost, unconstrained-ratio slot — just centers frameRef.
  const slotRef = useRef<HTMLDivElement>(null);
  // Sized (in real px) to the PNG's own aspect ratio — see updateBoardBox.
  const frameRef = useRef<HTMLDivElement>(null);
  // The real pan viewport — the frame's inner (SAFE_AREA) rectangle.
  const viewportRef = useRef<HTMLDivElement>(null);
  const [boardBox, setBoardBox] = useState({ w: 0, h: 0 });

  // Fixed scale that fits the safe area into the viewport — recomputed on
  // mount and on resize, but never changed by user interaction (no zoom).
  const [scale, setScale] = useState(0.2);
  const [translate, setTranslate] = useState<Point>({ x: 0, y: 0 });
  // Mirrors of the two state values above, updated in lockstep with every
  // setScale/setTranslate call (via the two setters below) rather than
  // only after a render commits, so the pointer-move handler always reads
  // the latest value instead of a stale closure.
  const scaleRef = useRef(scale);
  const translateRef = useRef(translate);

  const applyScale = useCallback((next: number) => {
    scaleRef.current = next;
    setScale(next);
  }, []);

  const applyTranslate = useCallback((next: Point) => {
    translateRef.current = next;
    setTranslate(next);
  }, []);

  // Keeps the SAFE_AREA rectangle (not the whole world) from ever panning
  // past its own edges: its screen position — translate shifted by how far
  // its top-left corner sits inside the world (SAFE_LEFT_PX/SAFE_TOP_PX) —
  // is clamped to [viewportSize - safeSize, 0] on each axis (standard
  // "content larger than container" bounds), so the visible content always
  // fills viewportRef with no gaps at its edges. If an axis's content is
  // already smaller than the viewport, that axis is just centered instead
  // — there's no room to pan it anyway.
  const clampTranslate = useCallback((t: Point, s: number): Point => {
    const vp = viewportRef.current;
    if (!vp) return t;
    const { width: vw, height: vh } = vp.getBoundingClientRect();
    const safeW = SAFE_WIDTH_PX * s;
    const safeH = SAFE_HEIGHT_PX * s;
    const clampAxis = (value: number, viewportSize: number, contentSize: number) => {
      if (contentSize <= viewportSize) return (viewportSize - contentSize) / 2;
      return Math.min(0, Math.max(viewportSize - contentSize, value));
    };
    const effX = clampAxis(t.x + SAFE_LEFT_PX * s, vw, safeW) - SAFE_LEFT_PX * s;
    const effY = clampAxis(t.y + SAFE_TOP_PX * s, vh, safeH) - SAFE_TOP_PX * s;
    return { x: effX, y: effY };
  }, []);

  const fitToViewport = useCallback(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const { width: vw, height: vh } = vp.getBoundingClientRect();
    if (!vw || !vh) return;
    // Base "fit" would show the whole safe area at once (0.99 = a hair of
    // breathing room so a note can never sit flush against, or a pixel
    // past, the drawn inner line) — then INITIAL_ZOOM blows that up so
    // notes render noticeably larger, with dragging needed to reach
    // whatever's now off-screen. The centering math below still applies
    // unchanged at this bigger scale: it just centers on the safe area's
    // middle instead of fitting its edges, and clampTranslate (which reads
    // this same scale) is what defines how far that leaves room to pan.
    const fit = Math.min(vw / SAFE_WIDTH_PX, vh / SAFE_HEIGHT_PX) * 0.99 * INITIAL_ZOOM;
    applyScale(fit);
    applyTranslate({
      x: (vw - SAFE_WIDTH_PX * fit) / 2 - SAFE_LEFT_PX * fit,
      y: (vh - SAFE_HEIGHT_PX * fit) / 2 - SAFE_TOP_PX * fit,
    });
  }, [applyScale, applyTranslate]);

  // Recomputes frameRef's pixel box from the slot's current size — the
  // largest box at BOARD_WIDTH/BOARD_HEIGHT's ratio that fits inside it,
  // centered by the slot's own flex centering. Runs on mount and on every
  // window resize.
  const updateBoardBox = useCallback(() => {
    const slot = slotRef.current;
    if (!slot) return;
    const { width: sw, height: sh } = slot.getBoundingClientRect();
    if (!sw || !sh) return;
    const ratio = BOARD_WIDTH / BOARD_HEIGHT;
    let w = sw;
    let h = w / ratio;
    if (h > sh) {
      h = sh;
      w = h * ratio;
    }
    setBoardBox((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
  }, []);

  useEffect(() => {
    updateBoardBox();
    window.addEventListener("resize", updateBoardBox);
    return () => window.removeEventListener("resize", updateBoardBox);
  }, [updateBoardBox]);

  // Only once frameRef (and therefore the viewportRef sized as a percentage
  // of it) has actually taken on boardBox's real pixel size — i.e. after
  // that state has committed and painted — does measuring viewportRef to
  // (re)fit the safe area make sense.
  useEffect(() => {
    if (boardBox.w > 0 && boardBox.h > 0) fitToViewport();
  }, [boardBox, fitToViewport]);

  // Single-pointer drag-to-pan. Pointer events unify mouse and touch, so
  // the same handlers drive click-drag on desktop and single-finger drag on
  // touch. Only one pointer is ever tracked (no pinch/zoom) — a second
  // simultaneous pointer is ignored until the first is released. Pointer-
  // downs that start on a sticky note never arrive here — StickyNote stops
  // that event's propagation itself.
  const activePointerId = useRef<number | null>(null);
  const panState = useRef<{ start: Point; translate: Point } | null>(null);

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (activePointerId.current !== null) return;
    // setPointerCapture can throw (e.g. InvalidPointerId) in edge cases the
    // browser doesn't consider an active pointer — guarded so a throw here
    // can't skip the state updates below and silently no-op the drag.
    try {
      viewportRef.current?.setPointerCapture(e.pointerId);
    } catch {}
    activePointerId.current = e.pointerId;
    panState.current = { start: { x: e.clientX, y: e.clientY }, translate: translateRef.current };
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerId !== activePointerId.current || !panState.current) return;
    const { start, translate: startTranslate } = panState.current;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    applyTranslate(clampTranslate({ x: startTranslate.x + dx, y: startTranslate.y + dy }, scaleRef.current));
  }

  function endPointer(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerId !== activePointerId.current) return;
    activePointerId.current = null;
    panState.current = null;
  }

  // Every dragged note claims a fresh top z-index for the duration of its
  // drag, via this shared counter — otherwise a lifted note can appear to
  // slide *behind* a neighboring note it passes over.
  const zCounter = useRef(NOTE_COUNT + 10);
  const liftNote = useCallback(() => {
    zCounter.current += 1;
    return zCounter.current;
  }, []);

  return (
    // Outer slot: just a centering box. Fills its parent's full height
    // (the page's flex-1/min-h-0 wrapper, itself capped to one viewport
    // below the header) instead of a fixed vh guess, so the whole board is
    // guaranteed to be visible on load with no scrolling needed.
    <div ref={slotRef} className="mx-auto flex h-full w-full items-center justify-center">
      {/* Layer 1: the frame — sized to the PNG's own aspect ratio, hosts
          the artwork unclipped and full-size. This box itself never pans;
          only the world layer (3) inside its viewport (2) does. */}
      <div ref={frameRef} className="relative" style={{ width: boardBox.w || undefined, height: boardBox.h || undefined }}>
        <Image
          src="/images/drawings/bulletin-board.png"
          alt=""
          fill
          priority
          draggable={false}
          unoptimized
          className="pointer-events-none select-none object-contain"
        />

        {/* Layer 2: the real pan viewport, clipped to the frame's own INNER
            line (SAFE_AREA) rather than the outer image edge — so panned
            content can never scroll into the margin between the inner line
            and the outer drawn border. */}
        <div
          ref={viewportRef}
          className="absolute cursor-grab touch-none select-none overflow-hidden active:cursor-grabbing"
          style={{
            left: `${SAFE_AREA.xMin}%`,
            top: `${SAFE_AREA.yMin}%`,
            width: `${SAFE_AREA.xMax - SAFE_AREA.xMin}%`,
            height: `${SAFE_AREA.yMax - SAFE_AREA.yMin}%`,
            touchAction: "none",
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endPointer}
          onPointerCancel={endPointer}
        >
          {/* "Welcome to my mind" — sticky: a direct child of the
              viewport, positioned in on-screen percentages rather than
              world coordinates, so it never moves when the notes layer
              below is panned or a note is dragged past/under it. */}
          <div
            className="pointer-events-none absolute z-10 whitespace-nowrap font-instrument text-[clamp(1.5rem,4vw,3rem)] text-[#2460A4]"
            style={{
              left: "50%",
              top: "4%",
              transform: "translate(-50%, -50%) rotate(-2deg)",
            }}
          >
            Welcome to my mind
          </div>

          {/* Layer 3: the pannable "world" — sticky notes only.
              Coordinate space is still the full BOARD_WIDTH × BOARD_HEIGHT
              (every note's xPct/yPct is relative to that); only the
              fit/translate math above changed to center the SAFE_AREA
              sub-rectangle of it into the viewport above. */}
          <div
            className="absolute left-0 top-0 origin-top-left"
            style={{
              width: BOARD_WIDTH,
              height: BOARD_HEIGHT,
              transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
            }}
          >
            {NOTES.map((note) => (
              <StickyNote
                key={note.id}
                xPct={note.xPct}
                yPct={note.yPct}
                rotation={note.rotation}
                color={note.color}
                text={note.text}
                width={note.width}
                height={note.height}
                scale={scale}
                onLift={liftNote}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
