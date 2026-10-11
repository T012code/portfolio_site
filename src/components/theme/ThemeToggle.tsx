"use client";

import { useTheme } from "./useTheme";
import styles from "./ThemeToggle.module.css";

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
      <span className={styles.track} aria-hidden="true">
        <span className={styles.thumb} data-theme={theme} suppressHydrationWarning />
      </span>
    </button>
  );
}
