"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import StickyNote from "./StickyNote";
import { BOARD_WIDTH, BOARD_HEIGHT, generateStickyNotes } from "@/lib/notes";

const NOTE_COUNT = 13;
// Generated once at module load (not per-render) with a fixed seed — see
// lib/notes.ts for why this needs to be deterministic rather than
// Math.random().
const NOTES = generateStickyNotes(NOTE_COUNT);

// Zoom is expressed as a multiplier on top of "fit the whole board in the
// viewport" rather than an absolute number, so it stays sensible at any
// viewport size: MIN_SCALE_FACTOR 1 means you can never zoom out past
// seeing the entire board (no point — it'd just add empty space around
// it), MAX_SCALE_FACTOR 6 is close enough to native resolution to read a
// note's placeholder text comfortably.
const MIN_SCALE_FACTOR = 1;
const MAX_SCALE_FACTOR = 6;

type Point = { x: number; y: number };

function distance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

// Pan/zoom viewport for the bulletin board. The outer element below (the
// one with overflow-hidden) is the only frozen thing on the page — it's
// the fixed "window" the user looks through. Everything else (board
// image, "Welcome to my mind", every sticky note) lives inside the single
// inner "world" div and pans/zooms together as one layer via a single CSS
// transform.
export default function BulletinBoard() {
  const viewportRef = useRef<HTMLDivElement>(null);
  // The "fit whole board to viewport" scale for the current viewport size —
  // recomputed on mount and on resize. Read from a ref (not state) inside
  // the wheel/pinch handlers below so they always clamp against the
  // current value without needing to be re-subscribed on every resize.
  const fitScaleRef = useRef(0.2);
  const [scale, setScale] = useState(0.2);
  const [translate, setTranslate] = useState<Point>({ x: 0, y: 0 });
  // Mirrors of the two state values above, updated in lockstep with every
  // setScale/setTranslate call (via the two setters below) rather than
  // only after a render commits. The wheel/pan/pinch handlers read from
  // these instead of the state closure so two gesture updates arriving in
  // the same tick (e.g. a fast wheel burst) always compute from the
  // latest value instead of both starting from the same stale one.
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

  const clampScale = useCallback((next: number) => {
    const fit = fitScaleRef.current;
    return Math.min(Math.max(next, fit * MIN_SCALE_FACTOR), fit * MAX_SCALE_FACTOR);
  }, []);

  // Keeps the world layer from ever panning past its own edges: once
  // zoomed in past fit-scale, translate is clamped to [viewportSize -
  // worldSize, 0] on each axis (standard "content larger than container"
  // bounds) so the board always fills the viewport with no empty gaps at
  // the edges. At-or-below fit-scale on an axis, that axis is just
  // centered — there's no room to pan it anyway.
  const clampTranslate = useCallback((t: Point, s: number): Point => {
    const vp = viewportRef.current;
    if (!vp) return t;
    const { width: vw, height: vh } = vp.getBoundingClientRect();
    const worldW = BOARD_WIDTH * s;
    const worldH = BOARD_HEIGHT * s;
    const clampAxis = (value: number, viewportSize: number, worldSize: number) => {
      if (worldSize <= viewportSize) return (viewportSize - worldSize) / 2;
      return Math.min(0, Math.max(viewportSize - worldSize, value));
    };
    return { x: clampAxis(t.x, vw, worldW), y: clampAxis(t.y, vh, worldH) };
  }, []);

  const fitToViewport = useCallback(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const { width: vw, height: vh } = vp.getBoundingClientRect();
    if (!vw || !vh) return;
    // 0.96 leaves a hair of breathing room so the drawn frame doesn't sit
    // flush against the viewport's own edge on load.
    const fit = Math.min(vw / BOARD_WIDTH, vh / BOARD_HEIGHT) * 0.96;
    fitScaleRef.current = fit;
    applyScale(fit);
    applyTranslate({ x: (vw - BOARD_WIDTH * fit) / 2, y: (vh - BOARD_HEIGHT * fit) / 2 });
  }, [applyScale, applyTranslate]);

  useEffect(() => {
    fitToViewport();
    window.addEventListener("resize", fitToViewport);
    return () => window.removeEventListener("resize", fitToViewport);
  }, [fitToViewport]);

  // Manual, non-passive wheel listener: React attaches its synthetic
  // onWheel passively, so calling preventDefault() from inside it silently
  // fails to stop the page itself from scrolling while the cursor is over
  // the board. A plain addEventListener with { passive: false } is the
  // standard workaround for a custom scroll-to-zoom interaction.
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    function onWheel(e: WheelEvent) {
      e.preventDefault();
      const rect = vp!.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const prevScale = scaleRef.current;
      const prevT = translateRef.current;
      const factor = Math.exp(-e.deltaY * 0.001);
      const nextScale = clampScale(prevScale * factor);
      // Zoom-to-cursor: keep whatever world point was under the pointer
      // still under the pointer after the scale changes. Computed as one
      // plain synchronous block (not a setState updater nesting another
      // setState updater) — React Strict Mode double-invokes impure
      // updater functions in dev, and an updater that calls another
      // setState as a side effect is exactly that, which was silently
      // doubling every zoom's pan delta on whichever axis wasn't already
      // clamped to center.
      const worldX = (px - prevT.x) / prevScale;
      const worldY = (py - prevT.y) / prevScale;
      const nextT = clampTranslate({ x: px - worldX * nextScale, y: py - worldY * nextScale }, nextScale);
      applyScale(nextScale);
      applyTranslate(nextT);
    }
    vp.addEventListener("wheel", onWheel, { passive: false });
    return () => vp.removeEventListener("wheel", onWheel);
  }, [clampScale, clampTranslate, applyScale, applyTranslate]);

  // Pointer-based pan + pinch-zoom. Pointer events unify mouse and touch,
  // so the same handlers drive click-drag-to-pan on desktop and
  // single-finger drag-to-pan on touch; a second simultaneous pointer
  // switches to pinch-zoom. Pointer-downs that start on a sticky note
  // never arrive here — StickyNote stops that event's propagation itself.
  const pointers = useRef(new Map<number, Point>());
  const panState = useRef<{ start: Point; translate: Point } | null>(null);
  const pinchState = useRef<{ dist: number; mid: Point; scale: number; translate: Point } | null>(null);

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    // setPointerCapture can throw (e.g. InvalidPointerId) in edge cases the
    // browser doesn't consider an active pointer — guarded so a throw here
    // can't skip the state updates below and silently no-op the drag.
    try {
      viewportRef.current?.setPointerCapture(e.pointerId);
    } catch {}
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 1) {
      panState.current = { start: { x: e.clientX, y: e.clientY }, translate: translateRef.current };
      pinchState.current = null;
    } else if (pointers.current.size === 2) {
      const pts = [...pointers.current.values()];
      panState.current = null;
      pinchState.current = {
        dist: distance(pts[0], pts[1]),
        mid: midpoint(pts[0], pts[1]),
        scale: scaleRef.current,
        translate: translateRef.current,
      };
    }
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size === 1 && panState.current) {
      const { start, translate: startTranslate } = panState.current;
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      applyTranslate(clampTranslate({ x: startTranslate.x + dx, y: startTranslate.y + dy }, scaleRef.current));
    } else if (pointers.current.size === 2 && pinchState.current) {
      const pts = [...pointers.current.values()];
      const newDist = distance(pts[0], pts[1]);
      const newMid = midpoint(pts[0], pts[1]);
      const { dist, mid, scale: startScale, translate: startTranslate } = pinchState.current;
      const nextScale = clampScale(startScale * (newDist / dist));
      const worldX = (mid.x - startTranslate.x) / startScale;
      const worldY = (mid.y - startTranslate.y) / startScale;
      // Fingers can drift together while pinching, not just apart/closer —
      // fold that midpoint movement in as pan on top of the zoom-to-point
      // math, or a two-finger pinch-drag would only zoom and ignore the pan.
      const midDx = newMid.x - mid.x;
      const midDy = newMid.y - mid.y;
      applyScale(nextScale);
      applyTranslate(
        clampTranslate({ x: mid.x - worldX * nextScale + midDx, y: mid.y - worldY * nextScale + midDy }, nextScale)
      );
    }
  }

  function endPointer(e: React.PointerEvent<HTMLDivElement>) {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size === 0) {
      panState.current = null;
      pinchState.current = null;
    } else if (pointers.current.size === 1) {
      const [remaining] = pointers.current.values();
      panState.current = { start: remaining, translate: translateRef.current };
      pinchState.current = null;
    }
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
    <div
      ref={viewportRef}
      className="relative mx-auto w-full max-w-6xl cursor-grab touch-none select-none overflow-hidden rounded-lg bg-[#e9e4da] active:cursor-grabbing"
      style={{ height: "70vh", touchAction: "none" }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endPointer}
      onPointerCancel={endPointer}
    >
      <div
        className="absolute left-0 top-0 origin-top-left"
        style={{
          width: BOARD_WIDTH,
          height: BOARD_HEIGHT,
          transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
        }}
      >
        <Image
          src="/images/drawings/bulletin-board.png"
          alt=""
          width={BOARD_WIDTH}
          height={BOARD_HEIGHT}
          priority
          draggable={false}
          unoptimized
          className="pointer-events-none block h-full w-full select-none"
        />

        <div
          className="pointer-events-none absolute whitespace-nowrap font-singsong text-[#2460A4]"
          style={{
            left: "50%",
            top: "8%",
            transform: "translate(-50%, -50%) rotate(-2deg)",
            fontSize: 150,
          }}
        >
          Welcome to my mind
        </div>

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
  );
}
