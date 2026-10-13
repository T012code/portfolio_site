"use client";

import { MoonStarsIcon, SunIcon } from "@phosphor-icons/react";
import { useTheme } from "./useTheme";
import styles from "./ThemeToggle.module.css";

// Both icons render; CSS shows the one for the active theme, so there is no flash before hydration.
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const next = theme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      className={styles.toggle}
      onClick={() => setTheme(next)}
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
      suppressHydrationWarning
    >
      <SunIcon className={styles.sun} size={20} weight="duotone" aria-hidden="true" />
      <MoonStarsIcon className={styles.moon} size={20} weight="duotone" aria-hidden="true" />
    </button>
  );
}
