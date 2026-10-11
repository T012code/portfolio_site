"use client";

import { useEffect, useRef } from "react";

// A small ink dot that trails the pointer and grows over interactive elements.
// Fine pointers only; the native cursor stays visible for precision.
export function Cursor() {
  const ref = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const target = { x: -100, y: -100 };
    const pos = { x: -100, y: -100 };
    let frame = 0;
    let running = false;

    const tick = () => {
      pos.x += (target.x - pos.x) * 0.2;
      pos.y += (target.y - pos.y) * 0.2;
      el.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
      if (Math.abs(target.x - pos.x) + Math.abs(target.y - pos.y) > 0.1) {
        frame = requestAnimationFrame(tick);
      } else {
        running = false;
      }
    };

    // Work out hover state from whatever sits under the pointer. Also run on scroll: the
    // page moves under a still pointer without any pointermove, which left the label stale.
    const sync = (under: Element | null) => {
      const interactive = under?.closest?.("a, button, [role='tab'], label, select, summary, [data-cursor]");
      const label = interactive?.closest("[data-cursor]")?.getAttribute("data-cursor");
      if (interactive) el.dataset.hover = "";
      else delete el.dataset.hover;
      if (el.dataset.label !== (label ?? "")) {
        el.dataset.label = label ?? "";
        if (labelRef.current) labelRef.current.textContent = label ?? "";
      }
    };

    const move = (e: PointerEvent) => {
      target.x = e.clientX;
      target.y = e.clientY;
      el.dataset.visible = "";
      sync(e.target as Element | null);
      if (!running) {
        running = true;
        frame = requestAnimationFrame(tick);
      }
    };
    let scrollFrame = 0;
    const scroll = () => {
      if (!("visible" in el.dataset)) return;
      cancelAnimationFrame(scrollFrame);
      scrollFrame = requestAnimationFrame(() => sync(document.elementFromPoint(target.x, target.y)));
    };
    const leave = () => delete el.dataset.visible;
    const down = () => (el.dataset.down = "");
    const up = () => delete el.dataset.down;

    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("scroll", scroll, { passive: true });
    document.documentElement.addEventListener("pointerleave", leave);
    window.addEventListener("pointerdown", down);
    window.addEventListener("pointerup", up);
    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(scrollFrame);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("scroll", scroll);
      document.documentElement.removeEventListener("pointerleave", leave);
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
    };
  }, []);

  return (
    <div ref={ref} className="cursor" aria-hidden="true">
      <div className="cursorDot">
        <span ref={labelRef} />
      </div>
    </div>
  );
}
