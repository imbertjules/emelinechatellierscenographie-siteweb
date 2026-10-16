"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { PlacementCanvas, type CanvasItem } from "@/components/PlacementCanvas";

const COPIES = 3;

type Props = {
  items: CanvasItem[];
  captionClassName?: string;
  minHeight?: number;
};

/**
 * Seamless vertical loop of the homepage placement board.
 * Renders three identical strips; when scroll leaves the middle strip,
 * jumps by one period so the user can scroll forever without a hard end.
 * Admin live edit keeps a single non-looping PlacementCanvas.
 */
export function HomeInfiniteCanvas({
  items,
  captionClassName,
  minHeight = 900,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [period, setPeriod] = useState(0);
  const primedRef = useRef(false);
  const adjustingRef = useRef(false);

  // Public home only: hide the viewport scrollbar while this canvas is mounted.
  // Wheel / trackpad / touch scroll still work. Admin live edit never mounts this.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("home-no-scrollbar");
    return () => root.classList.remove("home-no-scrollbar");
  }, []);

  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const first = wrap.querySelector<HTMLElement>('[data-loop-copy="0"]');
    if (!first) return;

    const measure = () => {
      const h = first.offsetHeight;
      if (h > 0) setPeriod(h);
    };
    measure();

    const ro = new ResizeObserver(measure);
    ro.observe(first);
    return () => ro.disconnect();
  }, [items]);

  const normalizeScroll = (forceMiddle: boolean) => {
    const wrap = wrapRef.current;
    if (!wrap || !period) return;
    const sectionTop = wrap.getBoundingClientRect().top + window.scrollY;
    let rel = window.scrollY - sectionTop;
    let next = window.scrollY;

    if (forceMiddle && !primedRef.current) {
      next = sectionTop + period;
      primedRef.current = true;
    } else {
      // Keep the viewport inside the middle strip [period, 2*period).
      while (rel >= period * 2) {
        next -= period;
        rel -= period;
      }
      while (rel < period) {
        next += period;
        rel += period;
      }
    }

    if (Math.abs(next - window.scrollY) > 1) {
      adjustingRef.current = true;
      window.scrollTo(0, next);
      requestAnimationFrame(() => {
        adjustingRef.current = false;
      });
    }
  };

  // Land in / stay in the middle copy as board height settles (images load).
  useLayoutEffect(() => {
    normalizeScroll(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when period changes
  }, [period]);

  useEffect(() => {
    if (!period) return;

    const onScroll = () => {
      if (adjustingRef.current) return;
      normalizeScroll(false);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  if (items.length === 0) return null;

  return (
    <div
      ref={wrapRef}
      className="home-infinite-canvas"
      style={{ overflowAnchor: "none" }}
    >
      {Array.from({ length: COPIES }, (_, copy) => (
        <div key={copy} data-loop-copy={copy}>
          <PlacementCanvas
            items={items.map((item) => ({
              ...item,
              id: `${item.id}__loop${copy}`,
            }))}
            editable={false}
            minHeight={minHeight}
            dark
            captionClassName={captionClassName}
          />
        </div>
      ))}
    </div>
  );
}
