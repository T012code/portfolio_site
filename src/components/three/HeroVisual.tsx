"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { Mark } from "@/components/brand/Mark";
import { whenPreloaded } from "@/components/preloader/events";
import { useTheme } from "@/components/theme/useTheme";
import { canRender3D } from "./gpu";

const HeroMark3D = dynamic(() => import("./HeroMark3D"), { ssr: false });

const INK = { light: "#262222", dark: "#D6D2CC" } as const;

// Static SVG mark first (no layout shift, works everywhere); the 3D version fades in over it.
export function HeroVisual({ className }: { className?: string }) {
  const { theme } = useTheme();
  const [enabled, setEnabled] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // After the preloader, at idle time, so the 3D bundle never competes with first paint.
    let idle: number | undefined;
    let timer: number | undefined;
    // Phones and tablets show the flat mark only.
    const start = () => setEnabled(window.matchMedia("(min-width: 761px) and (pointer: fine)").matches && canRender3D());
    const stopWaiting = whenPreloaded(() => {
      idle = window.requestIdleCallback?.(start, { timeout: 1500 });
      if (idle === undefined) timer = window.setTimeout(start, 400);
    });
    return () => {
      stopWaiting();
      if (idle !== undefined) window.cancelIdleCallback?.(idle);
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, []);

  return (
    <div className={className} aria-hidden="true" style={{ position: "relative" }}>
      <Mark
        style={{
          width: "72%",
          height: "auto",
          opacity: ready ? 0 : 1,
          transition: "opacity 0.6s var(--ease-out)",
        }}
      />
      {enabled ? (
        <div style={{ position: "absolute", inset: "-12%", opacity: ready ? 1 : 0, transition: "opacity 0.8s var(--ease-out)" }}>
          <HeroMark3D color={INK[theme]} onReady={() => setReady(true)} />
        </div>
      ) : null}
    </div>
  );
}
