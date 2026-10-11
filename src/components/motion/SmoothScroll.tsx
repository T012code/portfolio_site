"use client";

import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { useEffect } from "react";
import { whenPreloaded } from "@/components/preloader/events";

// Inertial scrolling for wheel and trackpad. Touch keeps native scrolling, and
// visitors who prefer reduced motion get the browser default.
export function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const lenis = new Lenis({ lerp: 0.11, anchors: { offset: -80 }, autoRaf: true });
    lenis.stop();
    const stopWaiting = whenPreloaded(() => lenis.start());
    // Pause while the mobile menu sheet is open.
    const observer = new MutationObserver(() => {
      if ("menuOpen" in document.documentElement.dataset) lenis.stop();
      else lenis.start();
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-menu-open"] });
    return () => {
      stopWaiting();
      observer.disconnect();
      lenis.destroy();
    };
  }, []);
  return null;
}
