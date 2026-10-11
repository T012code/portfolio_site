"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { Mark } from "@/components/brand/Mark";
import { whenPreloaded } from "@/components/preloader/events";
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
    const gl = (canvas.getContext("webgl2") ?? canvas.getContext("webgl")) as WebGLRenderingContext | null;
    if (!gl) return false;
    if (new URLSearchParams(window.location.search).get("3d") === "force") return true;
    // Without a GPU, WebGL falls back to CPU rendering and would block the page; keep the SVG.
    const info = gl.getExtension("WEBGL_debug_renderer_info");
    const renderer = String(info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return !/swiftshader|llvmpipe|softpipe|software|basic render/i.test(renderer);
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
    // After the preloader, at idle time, so the 3D bundle never competes with first paint.
    let idle: number | undefined;
    let timer: number | undefined;
    const start = () => setEnabled(canUse3D());
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
