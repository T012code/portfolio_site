"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { Mark } from "@/components/brand/Mark";
import { useTheme } from "@/components/theme/useTheme";

const HeroMark3D = dynamic(() => import("./HeroMark3D"), { ssr: false });

const INK = { light: "#262222", dark: "#D6D2CC" } as const;

function canUse3D() {
  try {
    const nav = navigator as Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number };
    if (nav.connection?.saveData) return false;
    if ((nav.hardwareConcurrency ?? 8) < 4) return false;
    if (nav.deviceMemory !== undefined && nav.deviceMemory < 3) return false;
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

// Static SVG mark first (no layout shift, works everywhere); the 3D version fades in over it.
export function HeroVisual({ className }: { className?: string }) {
  const { theme } = useTheme();
  const [enabled, setEnabled] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Defer to idle time so the 3D bundle never competes with first paint.
    const start = () => setEnabled(canUse3D());
    const idle = window.requestIdleCallback?.(start, { timeout: 1500 });
    const timer = idle === undefined ? window.setTimeout(start, 400) : undefined;
    return () => {
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
