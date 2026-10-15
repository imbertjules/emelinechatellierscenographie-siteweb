"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CanvasPlacement } from "@/lib/types";
import { estimatePlacementBottom } from "@/lib/types";

export type CanvasItem = {
  id: string;
  src: string;
  label?: string;
  /** HTML caption — rendered under this photo (not under the whole board). */
  caption?: string;
  placement: CanvasPlacement;
  href?: string;
};

type Mode = "drag" | "resize" | null;

const SNAP = 2;
const SNAP_TARGETS = [0, 50, 100];
const BOTTOM_PAD = 64;
const GROW_MARGIN = 48;
const MIN_W = 8;
/** Full width allowed so a photo can sit flush left and right. */
const MAX_W = 100;

function snapPos(value: number, size: number) {
  for (const t of SNAP_TARGETS) {
    if (Math.abs(value - t) <= SNAP) return t;
    if (Math.abs(value + size - t) <= SNAP) return t - size;
    if (Math.abs(value + size / 2 - t) <= SNAP) return t - size / 2;
  }
  return value;
}

function clampDrag(p: CanvasPlacement): CanvasPlacement {
  const w = Math.min(MAX_W, Math.max(MIN_W, p.w));
  const x = Math.min(100 - w, Math.max(0, p.x));
  const y = Math.max(0, Math.min(2000, p.y));
  return { x, y, w };
}

/** Resize from the bottom-right: left edge stays fixed. */
function clampResize(originX: number, originY: number, w: number): CanvasPlacement {
  const maxW = Math.min(MAX_W, 100 - originX);
  const nextW = Math.min(maxW, Math.max(MIN_W, w));
  return { x: originX, y: Math.max(0, originY), w: nextW };
}

function hasCaptionHtml(html?: string) {
  if (!html) return false;
  return (
    html
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .trim().length > 0
  );
}

type Props = {
  items: CanvasItem[];
  onChange?: (id: string, placement: CanvasPlacement) => void;
  editable?: boolean;
  minHeight?: number;
  dark?: boolean;
  className?: string;
  /**
   * Caption under each photo.
   * Home uses the pre-canvas 16px bold tight look; projects keep the project-page size.
   */
  captionClassName?: string;
};

const DEFAULT_CAPTION_CLASS =
  "caption-tight mt-2 text-sm md:text-base leading-relaxed typo-georgia opacity-80";

export function PlacementCanvas({
  items,
  onChange,
  editable = false,
  minHeight = 720,
  dark = true,
  className,
  captionClassName = DEFAULT_CAPTION_CLASS,
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
    pointerId: number;
    startX: number;
    startY: number;
    origin: CanvasPlacement;
  } | null>(null);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

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

    const drag = dragRef.current;
    if (drag) {
      const current = items.find((i) => i.id === drag.id)?.placement || drag.origin;
      const top = (current.y / 100) * width;
      const estH = (current.w / 100) * width * 0.75;
      maxBottom = Math.max(maxBottom, top + estH + GROW_MARGIN + BOTTOM_PAD);
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

  // Window-level listeners so resize/drag keep working if the pointer leaves the board
  useEffect(() => {
    if (!editable) return;

    const onMove = (e: PointerEvent) => {
      const drag = dragRef.current;
      const change = onChangeRef.current;
      const board = boardRef.current;
      if (!drag || !change || !board) return;
      if (e.pointerId !== drag.pointerId) return;

      const width = board.clientWidth || boardWidth || 1200;
      const dx = ((e.clientX - drag.startX) / width) * 100;
      const dy = ((e.clientY - drag.startY) / width) * 100;

      if (drag.mode === "drag") {
        let x = drag.origin.x + dx;
        let y = drag.origin.y + dy;
        x = snapPos(x, drag.origin.w);
        if (Math.abs(y) <= SNAP) y = 0;
        const next = clampDrag({ x, y, w: drag.origin.w });
        change(drag.id, next);
        const projectedBottom = estimatePlacementBottom(next, width) + BOTTOM_PAD + GROW_MARGIN;
        setContentHeight((h) => Math.max(h, Math.ceil(projectedBottom)));
      } else if (drag.mode === "resize") {
        // SE handle: follow the larger of horizontal / vertical mouse travel
        // so diagonal nwse-resize feels natural (height follows aspect ratio).
        const delta = Math.abs(dx) >= Math.abs(dy) ? dx : dy;
        const next = clampResize(drag.origin.x, drag.origin.y, drag.origin.w + delta);
        change(drag.id, next);
      }
    };

    const onUp = (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || e.pointerId !== drag.pointerId) return;
      dragRef.current = null;
      setMode(null);
      requestAnimationFrame(measureHeight);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [editable, boardWidth, measureHeight]);

  const setItemRef = (id: string, el: HTMLElement | null) => {
    if (el) itemRefs.current.set(id, el);
    else itemRefs.current.delete(id);
  };

  const beginInteraction = (e: React.PointerEvent, id: string, nextMode: Mode) => {
    if (!editable || !onChange || !nextMode) return;
    e.preventDefault();
    e.stopPropagation();
    const item = items.find((i) => i.id === id);
    if (!item) return;
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // Some browsers throw if capture isn't supported mid-gesture.
    }
    setActiveId(id);
    setMode(nextMode);
    dragRef.current = {
      id,
      mode: nextMode,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      origin: { ...item.placement },
    };
  };

  return (
    <div
      ref={boardRef}
      className={className}
      style={{
        position: "relative",
        width: "100%",
        height: contentHeight,
        minHeight,
        background: editable && !dark ? "#f4f4f4" : "transparent",
        border: editable ? "1px dashed rgba(255,255,255,0.2)" : "none",
        // Clip items to the board; admin scroll region also clips under the topbar
        overflow: editable ? "hidden" : "visible",
        isolation: "isolate",
        zIndex: 0,
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
        const resizing = mode === "resize" && activeId === item.id;
        const dragging = mode === "drag" && activeId === item.id;
        const showCaption = hasCaptionHtml(item.caption);

        const body = (
          <>
            <div style={{ position: "relative", width: "100%" }}>
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
                    pointerEvents: "none",
                  }}
                >
                  {item.label}
                </span>
              ) : null}
              {editable ? (
                <button
                  type="button"
                  aria-label="Redimensionner"
                  onPointerDown={(e) => beginInteraction(e, item.id, "resize")}
                  style={{
                    position: "absolute",
                    right: -8,
                    bottom: -8,
                    width: 20,
                    height: 20,
                    borderRadius: 2,
                    border: "2px solid #fff",
                    background: resizing ? "#fff" : "#111",
                    cursor: "nwse-resize",
                    padding: 0,
                    zIndex: 3,
                    touchAction: "none",
                  }}
                />
              ) : null}
            </div>
            {showCaption ? (
              <div
                className={captionClassName}
                style={{ pointerEvents: "none" }}
                dangerouslySetInnerHTML={{ __html: item.caption! }}
              />
            ) : null}
          </>
        );

        const style: React.CSSProperties = {
          position: "absolute",
          left: `${item.placement.x}%`,
          top: topPx,
          width: `${item.placement.w}%`,
          // No transform/filter/will-change — avoids promoted layers that escape overflow clip
          transform: "none",
          outline: "none",
          cursor: editable
            ? dragging
              ? "grabbing"
              : resizing
                ? "nwse-resize"
                : "grab"
            : item.href
              ? "pointer"
              : "default",
          // box-shadow on the image wrapper via selected ring on the item box
          boxShadow: selected
            ? dark
              ? "0 0 0 2px #fff"
              : "0 0 0 2px #111"
            : undefined,
          // Keep ≤ 10; admin-topbar is 10000 and sits outside the scroll clip
          zIndex: selected || dragging || resizing ? 2 : 1,
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
            onPointerDown={(e) => {
              // Ignore if the resize handle started the gesture
              if ((e.target as HTMLElement).closest('button[aria-label="Redimensionner"]')) return;
              beginInteraction(e, item.id, "drag");
            }}
            onClick={() => editable && setActiveId(item.id)}
          >
            {body}
          </div>
        );
      })}
    </div>
  );
}
