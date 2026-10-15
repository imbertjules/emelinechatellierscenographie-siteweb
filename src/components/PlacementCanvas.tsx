"use client";

import { useCallback, useRef, useState } from "react";
import type { CanvasPlacement } from "@/lib/types";
import { clampPlacement } from "@/lib/types";

export type CanvasItem = {
  id: string;
  src: string;
  label?: string;
  placement: CanvasPlacement;
  href?: string;
};

type Mode = "drag" | "resize" | null;

const SNAP = 2.5;
const SNAP_TARGETS = [0, 50, 100];

function snapValue(value: number, size: number, mode: "pos" | "edge") {
  if (mode === "pos") {
    for (const t of SNAP_TARGETS) {
      if (Math.abs(value - t) <= SNAP) return t;
      if (Math.abs(value + size - t) <= SNAP) return t - size;
      if (Math.abs(value + size / 2 - t) <= SNAP) return t - size / 2;
    }
  } else {
    for (const t of SNAP_TARGETS) {
      if (Math.abs(value + size - t) <= SNAP) return t - value;
    }
  }
  return value;
}

type Props = {
  items: CanvasItem[];
  onChange?: (id: string, placement: CanvasPlacement) => void;
  /** When false, items are display-only (public / aperçu). */
  editable?: boolean;
  /** Canvas height as a CSS value; width is 100%. */
  minHeight?: number;
  dark?: boolean;
  className?: string;
};

export function PlacementCanvas({
  items,
  onChange,
  editable = false,
  minHeight = 720,
  dark = true,
  className,
}: Props) {
  const boardRef = useRef<HTMLDivElement>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>(null);
  const dragRef = useRef<{
    id: string;
    mode: Mode;
    startX: number;
    startY: number;
    origin: CanvasPlacement;
  } | null>(null);

  const toPercent = useCallback((clientX: number, clientY: number) => {
    const board = boardRef.current;
    if (!board) return { x: 0, y: 0 };
    const rect = board.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * 100,
      y: ((clientY - rect.top) / rect.height) * 100,
    };
  }, []);

  const onPointerDown = (e: React.PointerEvent, id: string, nextMode: Mode) => {
    if (!editable || !onChange || !nextMode) return;
    e.preventDefault();
    e.stopPropagation();
    const item = items.find((i) => i.id === id);
    if (!item) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setActiveId(id);
    setMode(nextMode);
    dragRef.current = {
      id,
      mode: nextMode,
      startX: e.clientX,
      startY: e.clientY,
      origin: { ...item.placement },
    };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag || !onChange || !boardRef.current) return;
    const board = boardRef.current.getBoundingClientRect();
    const dx = ((e.clientX - drag.startX) / board.width) * 100;
    const dy = ((e.clientY - drag.startY) / board.height) * 100;

    if (drag.mode === "drag") {
      let x = drag.origin.x + dx;
      let y = drag.origin.y + dy;
      x = snapValue(x, drag.origin.w, "pos");
      y = snapValue(y, 0, "pos");
      onChange(drag.id, clampPlacement({ x, y, w: drag.origin.w }));
    } else if (drag.mode === "resize") {
      let w = drag.origin.w + dx;
      w = snapValue(drag.origin.x, w, "edge");
      onChange(drag.id, clampPlacement({ x: drag.origin.x, y: drag.origin.y, w }));
    }
  };

  const endDrag = () => {
    dragRef.current = null;
    setMode(null);
  };

  return (
    <div
      ref={boardRef}
      className={className}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      style={{
        position: "relative",
        width: "100%",
        minHeight,
        background: dark ? "#0a0a0a" : "#f4f4f4",
        border: editable ? "1px dashed #666" : "none",
        overflow: "hidden",
        touchAction: editable ? "none" : undefined,
        userSelect: editable ? "none" : undefined,
      }}
    >
      {editable ? (
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)",
            backgroundSize: "10% 10%",
            pointerEvents: "none",
          }}
        />
      ) : null}

      {items.map((item) => {
        const selected = editable && activeId === item.id;
        const body = (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.src}
              alt={item.label || ""}
              draggable={false}
              style={{
                width: "100%",
                height: "auto",
                display: "block",
                pointerEvents: "none",
                boxShadow: dark ? "0 8px 24px rgba(0,0,0,0.45)" : "0 4px 16px rgba(0,0,0,0.12)",
              }}
            />
            {item.label && editable ? (
              <span
                style={{
                  position: "absolute",
                  left: 6,
                  top: 6,
                  fontSize: 11,
                  padding: "2px 6px",
                  background: "rgba(0,0,0,0.65)",
                  color: "#fff",
                  maxWidth: "90%",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {item.label}
              </span>
            ) : null}
            {editable ? (
              <button
                type="button"
                aria-label="Redimensionner"
                onPointerDown={(e) => onPointerDown(e, item.id, "resize")}
                style={{
                  position: "absolute",
                  right: -6,
                  bottom: -6,
                  width: 16,
                  height: 16,
                  borderRadius: 2,
                  border: "1px solid #fff",
                  background: "#111",
                  cursor: "nwse-resize",
                  padding: 0,
                }}
              />
            ) : null}
          </>
        );

        const style: React.CSSProperties = {
          position: "absolute",
          left: `${item.placement.x}%`,
          top: `${item.placement.y}%`,
          width: `${item.placement.w}%`,
          cursor: editable ? (mode === "drag" && activeId === item.id ? "grabbing" : "grab") : item.href ? "pointer" : "default",
          outline: selected ? "2px solid #fff" : undefined,
          zIndex: selected ? 5 : 1,
        };

        if (item.href && !editable) {
          return (
            <a key={item.id} href={item.href} style={style}>
              {body}
            </a>
          );
        }

        return (
          <div
            key={item.id}
            style={style}
            onPointerDown={(e) => onPointerDown(e, item.id, "drag")}
            onClick={() => editable && setActiveId(item.id)}
          >
            {body}
          </div>
        );
      })}
    </div>
  );
}
