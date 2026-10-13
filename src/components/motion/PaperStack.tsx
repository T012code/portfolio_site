"use client";

import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import { useState, type ReactNode } from "react";
import styles from "./PaperStack.module.css";

// Where each sheet rests, and where it fans to when the pointer is over the stack.
const SHEETS = [
  { tone: "pop", rest: { x: 34, y: 18, rotate: 7 }, fan: { x: 64, y: 8, rotate: 12 } },
  { tone: "sky", rest: { x: -30, y: 12, rotate: -6 }, fan: { x: -58, y: 4, rotate: -11 } },
] as const;

const spring = { type: "spring", stiffness: 170, damping: 20, mass: 0.9 } as const;

// The CV as paper: a printed top sheet with two tinted sheets beneath. The stack deals in on
// load, fans out under the pointer, and the top sheet leans toward it. Touch and reduced motion
// get the resting stack.
export function PaperStack({ children, label }: { children: ReactNode; label: string }) {
  const reduce = useReducedMotion();
  const [fanned, setFanned] = useState(false);
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const rotateX = useSpring(useTransform(py, [-0.5, 0.5], [6, -6]), { stiffness: 220, damping: 22 });
  const rotateY = useSpring(useTransform(px, [-0.5, 0.5], [-8, 8]), { stiffness: 220, damping: 22 });

  return (
    <div
      className={styles.stage}
      onPointerMove={(e) => {
        if (reduce || e.pointerType !== "mouse") return;
        const r = e.currentTarget.getBoundingClientRect();
        px.set((e.clientX - r.left) / r.width - 0.5);
        py.set((e.clientY - r.top) / r.height - 0.5);
        setFanned(true);
      }}
      onPointerLeave={() => {
        px.set(0);
        py.set(0);
        setFanned(false);
      }}
    >
      {SHEETS.map((sheet, i) => (
        <motion.div
          key={sheet.tone}
          className={styles.under}
          data-tone={sheet.tone}
          aria-hidden="true"
          initial={reduce ? false : { x: 0, y: 140, rotate: 0, opacity: 0 }}
          animate={{ ...(fanned ? sheet.fan : sheet.rest), opacity: 1 }}
          transition={{ ...spring, delay: fanned ? 0 : 0.25 + i * 0.12 }}
        >
          <span className={styles.lines} />
        </motion.div>
      ))}
      <motion.figure
        className={styles.top}
        aria-label={label}
        initial={reduce ? false : { y: 160, rotate: -3, opacity: 0 }}
        animate={{ y: fanned ? -10 : 0, rotate: fanned ? -1 : -2, opacity: 1 }}
        transition={{ ...spring, delay: fanned ? 0 : 0.5 }}
        style={{ rotateX, rotateY, transformPerspective: 1200 }}
      >
        <span className={styles.clip} aria-hidden="true" />
        {children}
      </motion.figure>
    </div>
  );
}
