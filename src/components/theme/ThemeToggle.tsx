"use client";

import { MoonStarsIcon, SunIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { whenPreloaded } from "@/components/preloader/events";
import { useTheme } from "./useTheme";
import styles from "./ThemeToggle.module.css";

const HINT_KEY = "layo-theme-hint";

// Both icons render; CSS shows the one for the active theme, so there is no flash before hydration.
// With `hint`, the first page of a visit gets a nudge once the preloader is done: the button pops
// and a tooltip names the current mode for a couple of seconds.
export function ThemeToggle({ hint = false }: { hint?: boolean }) {
  const { theme, setTheme } = useTheme();
  const next = theme === "dark" ? "light" : "dark";
  const [nudge, setNudge] = useState<"off" | "in" | "out">("off");

  useEffect(() => {
    if (!hint) return;
    try {
      if (sessionStorage.getItem(HINT_KEY)) return;
    } catch {
      // Without storage the hint can show again next visit; harmless.
    }
    const timers: number[] = [];
    const stop = whenPreloaded(() => {
      timers.push(
        window.setTimeout(() => {
          try {
            sessionStorage.setItem(HINT_KEY, "1");
          } catch {}
          setNudge("in");
        }, 900),
      );
      timers.push(window.setTimeout(() => setNudge("out"), 3600));
      timers.push(window.setTimeout(() => setNudge("off"), 4000));
    });
    const dismiss = () => {
      timers.forEach((t) => window.clearTimeout(t));
      setNudge((n) => (n === "in" ? "out" : n));
      timers.push(window.setTimeout(() => setNudge("off"), 400));
    };
    window.addEventListener("pointerdown", dismiss, { once: true });
    return () => {
      stop();
      timers.forEach((t) => window.clearTimeout(t));
      window.removeEventListener("pointerdown", dismiss);
    };
  }, [hint]);

  return (
    <span className={styles.wrap}>
      <button
        type="button"
        className={styles.toggle}
        data-nudge={nudge === "in" || undefined}
        onClick={() => setTheme(next)}
        aria-label={`Switch to ${next} theme`}
        title={`Switch to ${next} theme`}
        suppressHydrationWarning
      >
        <SunIcon className={styles.sun} size={20} weight="duotone" aria-hidden="true" />
        <MoonStarsIcon className={styles.moon} size={20} weight="duotone" aria-hidden="true" />
      </button>
      {nudge !== "off" ? (
        <span className={styles.tip} data-state={nudge} role="status">
          You&apos;re viewing the site in <strong>{theme} mode</strong>
          <span className={styles.tipSub}>Tap the button to switch</span>
        </span>
      ) : null}
    </span>
  );
}
