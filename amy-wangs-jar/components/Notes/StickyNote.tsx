"use client";

import { useRef, useState } from "react";
import { BOARD_WIDTH, BOARD_HEIGHT, clampToSafeArea } from "@/lib/notes";

type Props = {
  xPct: number;
  yPct: number;
  rotation: number;
  color: string;
  text: string;
  width: number;
  height: number;
  // Current board zoom level, kept live from the parent — a drag's
  // on-screen pointer distance has to be divided by this before it's
  // converted into a board-percentage delta, otherwise a note dragged
  // while zoomed in would fly across the board much faster than the
  // cursor actually moved.
  scale: number;
  // Called once when a drag starts; returns the z-index this note should
  // claim so it visually lifts above every neighbor for the drag's
  // duration, even ones it passes over.
  onLift: () => number;
};

// Placeholder sticky note — a rotated, tinted box with placeholder text.
// Swap `color` for a `background`/<Image> real photo later without
// touching the positioning, drag, or clamping logic below.
export default function StickyNote({ xPct, yPct, rotation, color, text, width, height, scale, onLift }: Props) {
  const [pos, setPos] = useState({ xPct, yPct });
  const [dragging, setDragging] = useState(false);
  const [z, setZ] = useState(1);
  const dragState = useRef<{ startX: number; startY: number; startPos: { xPct: number; yPct: number } } | null>(
    null
  );

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    // The one line that makes "drag board" vs "drag note" not fight each
    // other: stop this pointer-down from ever reaching the board's own
    // pan handler, so picking up a note never also starts panning the
    // whole board underneath it.
    e.stopPropagation();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    dragState.current = { startX: e.clientX, startY: e.clientY, startPos: pos };
    setDragging(true);
    setZ(onLift());
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragState.current) return;
    e.stopPropagation();
    const { startX, startY, startPos } = dragState.current;
    const dxPct = ((e.clientX - startX) / scale / BOARD_WIDTH) * 100;
    const dyPct = ((e.clientY - startY) / scale / BOARD_HEIGHT) * 100;
    setPos(clampToSafeArea(startPos.xPct + dxPct, startPos.yPct + dyPct, width, height));
  }

  function endDrag(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragState.current) return;
    e.stopPropagation();
    dragState.current = null;
    setDragging(false);
  }

  return (
    <div
      className="absolute touch-none select-none"
      style={{
        left: `${pos.xPct}%`,
        top: `${pos.yPct}%`,
        width,
        height,
        zIndex: dragging ? 9999 : z,
        transform: `translate(-50%, -50%) rotate(${rotation}deg) scale(${dragging ? 1.05 : 1})`,
        transition: dragging ? "none" : "transform 0.15s ease-out, box-shadow 0.15s ease-out",
        cursor: dragging ? "grabbing" : "grab",
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      {/* Separate inner element for color/shadow/text so the outer div can
          own position/rotation/scale transforms cleanly. */}
      <div
        className="flex h-full w-full items-center justify-center overflow-hidden p-[6%] text-center font-roboto font-light leading-snug text-gray-700"
        style={{
          backgroundColor: color,
          fontSize: Math.round(width * 0.075),
          boxShadow: dragging
            ? "0 40px 60px rgba(0,0,0,0.35), 0 10px 16px rgba(0,0,0,0.2)"
            : "0 16px 26px rgba(0,0,0,0.22), 0 4px 7px rgba(0,0,0,0.14)",
        }}
      >
        {text}
      </div>
    </div>
  );
}
