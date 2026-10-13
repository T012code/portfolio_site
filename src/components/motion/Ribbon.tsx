"use client";

import {
  motion,
  useAnimationFrame,
  useInView,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
  wrap,
} from "motion/react";
import { useRef, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  /** Base drift in percent of one copy per second; negative runs right to left. */
  speed?: number;
  className?: string;
  trackClassName?: string;
  label?: string;
};

// An endless band that drifts on its own and surges with scroll speed (and flips with direction).
// Four copies so the seam never shows; only the first is exposed to assistive tech.
export function Ribbon({ children, speed = -0.8, className, trackClassName, label }: Props) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  // Off screen, the band stops: no work on frames nobody sees.
  const inView = useInView(ref, { margin: "100px 0px" });
  const base = useMotionValue(0);
  const { scrollY } = useScroll();
  const velocity = useVelocity(scrollY);
  const smooth = useSpring(velocity, { damping: 50, stiffness: 400 });
  const boost = useTransform(smooth, [-2000, 0, 2000], [-1.5, 0, 1.5]);
  const direction = useRef(1);
  const x = useTransform(base, (v) => `${wrap(-25, 0, v)}%`);

  useAnimationFrame((_, delta) => {
    if (reduce || !inView) return;
    const b = boost.get();
    if (b < 0) direction.current = -1;
    else if (b > 0) direction.current = 1;
    const move = direction.current * speed * (delta / 1000) * (1 + Math.abs(b));
    base.set(base.get() + move);
  });

  return (
    <div ref={ref} className={className} aria-label={label} role={label ? "region" : undefined}>
      <motion.div className={trackClassName} style={{ x, display: "flex", width: "max-content" }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} aria-hidden={i > 0 || undefined} style={{ display: "flex", flex: "none" }}>
            {children}
          </div>
        ))}
      </motion.div>
    </div>
  );
}
