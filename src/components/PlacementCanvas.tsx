"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CanvasPlacement } from "@/lib/types";
import { clampPlacement, estimatePlacementBottom } from "@/lib/types";

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
const BOTTOM_PAD = 64;
const GROW_MARGIN = 48;

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
  /** Minimum canvas height in px before content grows it. */
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
  const itemRefs = useRef<Map<string, HTMLElement>>(new Map());
  const [boardWidth, setBoardWidth] = useState(1200);
  const [contentHeight, setContentHeight] = useState(minHeight);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>(null);
  const dragRef = useRef<{
    id: string;
    mode: Mode;
    startX: number;
    startY: number;
    origin: CanvasPlacement;
  } | null>(null);

  const measureHeight = useCallback(() => {
    const board = boardRef.current;
    const width = board?.clientWidth || boardWidth || 1200;
    let maxBottom = minHeight;

    for (const item of items) {
      const el = itemRefs.current.get(item.id);
      if (el) {
        maxBottom = Math.max(maxBottom, el.offsetTop + el.offsetHeight + BOTTOM_PAD);
      } else {
        maxBottom = Math.max(
          maxBottom,
          estimatePlacementBottom(item.placement, width) + BOTTOM_PAD,
        );
      }
    }

    // While dragging near/past the bottom, keep slack so the page elongates under the cursor
    const drag = dragRef.current;
    if (drag && board) {
      const origin = items.find((i) => i.id === drag.id)?.placement || drag.origin;
      const top = (origin.y / 100) * width;
      maxBottom = Math.max(maxBottom, top + GROW_MARGIN + BOTTOM_PAD + 120);
    }

    setContentHeight(Math.ceil(maxBottom));
  }, [items, minHeight, boardWidth]);

  useLayoutEffect(() => {
    const board = boardRef.current;
    if (!board) return;

    const updateWidth = () => {
      setBoardWidth(board.clientWidth || 1200);
    };
    updateWidth();

    const ro = new ResizeObserver(() => {
      updateWidth();
      measureHeight();
    });
    ro.observe(board);
    return () => ro.disconnect();
  }, [measureHeight]);

  useLayoutEffect(() => {
    measureHeight();
  }, [items, boardWidth, measureHeight]);

  useEffect(() => {
    const imgs = boardRef.current?.querySelectorAll("img") || [];
    const onLoad = () => measureHeight();
    imgs.forEach((img) => img.addEventListener("load", onLoad));
    return () => imgs.forEach((img) => img.removeEventListener("load", onLoad));
  }, [items, measureHeight]);

  const setItemRef = (id: string, el: HTMLElement | null) => {
    if (el) itemRefs.current.set(id, el);
    else itemRefs.current.delete(id);
  };

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
    const width = boardRef.current.clientWidth || boardWidth;
    // Both axes use width so vertical units stay stable as height grows
    const dx = ((e.clientX - drag.startX) / width) * 100;
    const dy = ((e.clientY - drag.startY) / width) * 100;

    if (drag.mode === "drag") {
      let x = drag.origin.x + dx;
      let y = drag.origin.y + dy;
      x = snapValue(x, drag.origin.w, "pos");
      // light snap only near top (y≈0); do not snap to a fixed bottom
      if (Math.abs(y) <= SNAP) y = 0;
      const next = clampPlacement({ x, y, w: drag.origin.w });
      onChange(drag.id, next);

      const projectedBottom = estimatePlacementBottom(next, width) + BOTTOM_PAD + GROW_MARGIN;
      if (projectedBottom > contentHeight) {
        setContentHeight(Math.ceil(projectedBottom));
      }
    } else if (drag.mode === "resize") {
      let w = drag.origin.w + dx;
      w = snapValue(drag.origin.x, w, "edge");
      const next = clampPlacement({ x: drag.origin.x, y: drag.origin.y, w });
      onChange(drag.id, next);
      requestAnimationFrame(measureHeight);
    }
  };

  const endDrag = () => {
    dragRef.current = null;
    setMode(null);
    requestAnimationFrame(measureHeight);
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
        height: contentHeight,
        minHeight,
        background: editable ? (dark ? "#0a0a0a" : "#f4f4f4") : "transparent",
        border: editable ? "1px dashed #444" : "none",
        overflow: "visible",
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
              "linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)",
            backgroundSize: `${Math.max(40, boardWidth / 10)}px ${Math.max(40, boardWidth / 10)}px`,
            pointerEvents: "none",
          }}
        />
      ) : null}

      {items.map((item) => {
        const selected = editable && activeId === item.id;
        const topPx = (item.placement.y / 100) * boardWidth;
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
          top: topPx,
          width: `${item.placement.w}%`,
          cursor: editable
            ? mode === "drag" && activeId === item.id
              ? "grabbing"
              : "grab"
            : item.href
              ? "pointer"
              : "default",
          outline: selected ? "2px solid #fff" : undefined,
          zIndex: selected ? 5 : 1,
        };

        if (item.href && !editable) {
          return (
            <a
              key={item.id}
              href={item.href}
              style={style}
              ref={(el) => setItemRef(item.id, el)}
            >
              {body}
            </a>
          );
        }

        return (
          <div
            key={item.id}
            style={style}
            ref={(el) => setItemRef(item.id, el)}
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
