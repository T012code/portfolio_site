"use client";

import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import Image from "next/image";
import type { ReactNode } from "react";
import styles from "./HeroPortrait.module.css";

type Chip = { key: string; node: ReactNode };

type Props = {
  portrait: string | null;
  alt: string;
  chips: Chip[];
  sticker: ReactNode;
};

// Where each chip floats around the portrait, and how far it drifts with the pointer (depth).
const SPOTS = [
  { top: "8%", left: "-10%", depth: 26, bob: 7, delay: 0 },
  { top: "34%", right: "-12%", depth: 34, bob: 9, delay: 0.6 },
  { bottom: "22%", left: "-14%", depth: 18, bob: 6, delay: 1.1 },
  { bottom: "4%", right: "-6%", depth: 30, bob: 8, delay: 0.3 },
  { top: "-4%", right: "18%", depth: 14, bob: 5, delay: 0.9 },
] as const;

// The portrait sits in a lit arch; stack chips float around it and drift against the pointer for depth.
export function HeroPortrait({ portrait, alt, chips, sticker }: Props) {
  const reduce = useReducedMotion();
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 80, damping: 20 });
  const sy = useSpring(my, { stiffness: 80, damping: 20 });
  const photoX = useTransform(sx, (v) => v * -8);
  const photoY = useTransform(sy, (v) => v * -8);

  return (
    <div
      className={styles.stage}
      onPointerMove={(e) => {
        if (reduce || e.pointerType !== "mouse") return;
        const r = e.currentTarget.getBoundingClientRect();
        mx.set(((e.clientX - r.left) / r.width - 0.5) * 2);
        my.set(((e.clientY - r.top) / r.height - 0.5) * 2);
      }}
      onPointerLeave={() => {
        mx.set(0);
        my.set(0);
      }}
    >
      <div className={styles.halo} aria-hidden="true" />
      <motion.div
        className={styles.arch}
        initial={reduce ? false : { clipPath: "inset(100% 0% 0% 0% round 999px 999px 32px 32px)" }}
        animate={{ clipPath: "inset(0% 0% 0% 0% round 999px 999px 32px 32px)" }}
        transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
      >
        <motion.div className={styles.photo} style={{ x: photoX, y: photoY, scale: 1.06 }}>
          {portrait ? (
            <Image src={portrait} alt={alt} fill priority sizes="(max-width: 900px) 80vw, 34vw" />
          ) : null}
        </motion.div>
      </motion.div>

      {chips.slice(0, SPOTS.length).map((chip, i) => (
        <Floating key={chip.key} index={i} sx={sx} sy={sy} reduce={Boolean(reduce)}>
          {chip.node}
        </Floating>
      ))}

      <motion.div
        className={styles.sticker}
        initial={reduce ? false : { scale: 0, rotate: -40 }}
        animate={{ scale: 1, rotate: -8 }}
        transition={{ type: "spring", stiffness: 260, damping: 16, delay: 1 }}
      >
        {sticker}
      </motion.div>
    </div>
  );
}

function Floating({
  children,
  index,
  sx,
  sy,
  reduce,
}: {
  children: ReactNode;
  index: number;
  sx: ReturnType<typeof useSpring>;
  sy: ReturnType<typeof useSpring>;
  reduce: boolean;
}) {
  const spot = SPOTS[index];
  const x = useTransform(sx, (v) => v * spot.depth);
  const y = useTransform(sy, (v) => v * spot.depth);
  const { depth: _depth, bob, delay, ...position } = spot;
  void _depth;

  return (
    <motion.div className={styles.chipSpot} style={{ ...position, x, y }}>
      <motion.div
        className={styles.chip}
        initial={reduce ? false : { opacity: 0, scale: 0.6, y: 20 }}
        animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1, y: [0, -bob, 0] }}
        transition={
          reduce
            ? { duration: 0 }
            : {
                opacity: { duration: 0.5, delay: 0.7 + index * 0.12 },
                scale: { type: "spring", stiffness: 300, damping: 18, delay: 0.7 + index * 0.12 },
                y: { duration: 4 + index * 0.6, ease: "easeInOut", repeat: Infinity, delay },
              }
        }
      >
        {children}
      </motion.div>
    </motion.div>
  );
}
