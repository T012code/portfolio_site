"use client";

import { motion, useMotionTemplate, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import type { ReactNode } from "react";

type Props = { children: ReactNode; className?: string; max?: number };

// Leans toward the pointer in 3D and carries a soft light where the pointer is (fine pointers only).
export function Tilt({ children, className, max = 6 }: Props) {
  const reduce = useReducedMotion();
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const spring = { stiffness: 260, damping: 24, mass: 0.6 };
  const rotateX = useSpring(useTransform(py, [0, 1], [max, -max]), spring);
  const rotateY = useSpring(useTransform(px, [0, 1], [-max, max]), spring);
  const glow = useSpring(0, { stiffness: 200, damping: 30 });
  const lx = useTransform(px, (v) => `${v * 100}%`);
  const ly = useTransform(py, (v) => `${v * 100}%`);
  const light = useMotionTemplate`radial-gradient(420px circle at ${lx} ${ly}, color-mix(in srgb, var(--color-accent) 16%, transparent), transparent 60%)`;

  return (
    <motion.div
      className={className}
      style={{ rotateX, rotateY, transformPerspective: 1100 }}
      onPointerMove={(e) => {
        if (reduce || e.pointerType !== "mouse") return;
        const r = e.currentTarget.getBoundingClientRect();
        px.set((e.clientX - r.left) / r.width);
        py.set((e.clientY - r.top) / r.height);
        glow.set(1);
      }}
      onPointerLeave={() => {
        glow.set(0);
        px.set(0.5);
        py.set(0.5);
      }}
    >
      {children}
      <motion.span
        aria-hidden="true"
        style={{ position: "absolute", inset: 0, borderRadius: "inherit", pointerEvents: "none", background: light, opacity: glow }}
      />
    </motion.div>
  );
}
