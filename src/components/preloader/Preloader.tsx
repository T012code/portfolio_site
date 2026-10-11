"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { MARK_PATHS, MARK_VIEWBOX } from "@/components/brand/paths";
import { Wordmark } from "@/components/brand/Wordmark";
import { canRender3D } from "@/components/three/gpu";
import { PRELOADED_EVENT, PRELOADED_KEY } from "./events";
import styles from "./Preloader.module.css";

const PreloaderScene = dynamic(() => import("./PreloaderScene"), { ssr: false });

const GLYPHS = "01<>/{}[]#$%&*+=?ABCDEFGHJKLMNPQRSTUVWXYZ";
const MIN_MS = 2400;
const MAX_MS = 6500;
const EXIT_MS = 950;

// The head script marks repeat visits in this session; read it without a hydration mismatch.
const subscribe = () => () => {};
const alreadySeen = () => "preloaded" in document.documentElement.dataset;

export function Preloader({ motto, location }: { motto: string; location: string }) {
  const skipped = useSyncExternalStore(subscribe, alreadySeen, () => false);
  const [phase, setPhase] = useState<"loading" | "leaving" | "done">("loading");
  const [use3D, setUse3D] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const counterRef = useRef<HTMLSpanElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);
  const mottoRef = useRef<HTMLSpanElement>(null);
  const sceneReadyRef = useRef(false);
  const introDoneRef = useRef(false);
  const onIntroDone = useCallback(() => {
    introDoneRef.current = true;
  }, []);
  const onSceneReady = useCallback(() => {
    sceneReadyRef.current = true;
    setSceneReady(true);
  }, []);

  useEffect(() => {
    if (skipped) return;
    // Hydrated: the JavaScript timeline takes over from the CSS failsafe.
    rootRef.current?.setAttribute("data-hydrated", "");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const gpu = !reduced && canRender3D();
    if (!gpu) {
      sceneReadyRef.current = true;
      introDoneRef.current = true;
    }
    // Deferred so the 3D bundle request starts after this effect, not during it.
    queueMicrotask(() => setUse3D(gpu));

    const start = performance.now();
    const minMs = reduced ? 700 : MIN_MS;
    // Ready = fonts loaded (for the first paint of the page underneath) and the 3D scene,
    // if any, compiled. Images further down the page are not worth waiting for.
    let fontsReady = false;
    document.fonts?.ready.then(() => (fontsReady = true));

    // Motto: glyphs resolve left to right into the real words.
    const text = motto;
    const resolveStart = reduced ? 0 : 500;
    const resolveDur = reduced ? 1 : 1500;

    let shown = 0;
    let last = start;
    let frame = 0;
    let finished = false;
    const tick = (now: number) => {
      const elapsed = now - start;
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      // The 3D intro must have played through; MAX_MS caps everything for slow devices.
      const ready = (fontsReady || elapsed > 1500) && sceneReadyRef.current && introDoneRef.current;
      const timeShare = Math.min(elapsed / minMs, 1);
      const target = elapsed > MAX_MS ? 100 : Math.min(timeShare * 92 + (ready ? 8 : 0), ready ? 100 : 92);
      // Time-based easing, so the counter keeps pace on slow devices too.
      shown += (target - shown) * (1 - Math.exp(-dt * 7));
      if (target === 100 && shown > 99.5) shown = 100;
      const value = Math.floor(shown);
      if (counterRef.current) counterRef.current.textContent = String(value).padStart(3, "0");
      if (barRef.current) barRef.current.style.transform = `scaleX(${shown / 100})`;

      if (mottoRef.current) {
        const p = Math.min(1, Math.max(0, (elapsed - resolveStart) / resolveDur));
        const fixed = Math.floor(p * text.length);
        let out = "";
        for (let i = 0; i < text.length; i++) {
          const c = text[i];
          out += i < fixed || c === " " ? c : GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        }
        mottoRef.current.textContent = out;
      }

      if (value >= 100 && elapsed > minMs && !finished) {
        finished = true;
        if (mottoRef.current) mottoRef.current.textContent = text;
        setPhase("leaving");
        document.documentElement.dataset.preloaderLeaving = "";
        window.setTimeout(() => {
          try {
            sessionStorage.setItem(PRELOADED_KEY, "1");
          } catch {
            // Private mode: the preloader will simply show again next visit.
          }
          setPhase("done");
          window.dispatchEvent(new Event(PRELOADED_EVENT));
        }, reduced ? 300 : EXIT_MS);
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frame);
  }, [skipped, motto]);

  if (skipped || phase === "done") return null;

  return (
    <div ref={rootRef} className={styles.preloader} data-preloader="" data-phase={phase} aria-hidden="true">
      <div className={styles.grid} />
      <div className={styles.scan} />

      <div className={styles.stage}>
        {use3D ? (
          <div className={styles.canvas} data-ready={sceneReady || undefined}>
            <PreloaderScene leaving={phase === "leaving"} onReady={onSceneReady} onIntroDone={onIntroDone} />
          </div>
        ) : null}
        <svg
          className={styles.outline}
          viewBox={MARK_VIEWBOX}
          data-hidden={(use3D && sceneReady) || undefined}
        >
          {MARK_PATHS.map((d) => (
            <path key={d.slice(0, 16)} d={d} pathLength={1} />
          ))}
        </svg>
      </div>

      <div className={styles.hudTop}>
        <Wordmark className={styles.wordmark} />
        <span className={styles.hudText}>The developer</span>
      </div>
      <div className={styles.hudTopRight}>
        <span className={styles.hudText}>{location}</span>
        <span className={styles.hudText}>
          <span className={styles.blink} /> Building
        </span>
      </div>

      <div className={styles.bottom}>
        <p className={styles.motto}>
          {/* The real words set the size; the scramble is drawn on a layer above, so nothing reflows. */}
          <span className={styles.mottoSizer}>{motto}</span>
          <span ref={mottoRef} className={styles.mottoLayer}>
            {motto}
          </span>
        </p>
        <div className={styles.progress}>
          <span className={styles.counter}>
            <span ref={counterRef}>000</span>%
          </span>
          <span className={styles.track}>
            <span ref={barRef} className={styles.bar} />
          </span>
        </div>
      </div>
    </div>
  );
}
