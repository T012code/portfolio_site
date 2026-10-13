"use client";

import { motion, useReducedMotion, useScroll, useSpring } from "motion/react";
import { useRef, type ReactNode } from "react";

// A vertical rail that fills in cobalt as the reader scrolls through the list beside it.
export function Timeline({ children, className, railClassName, fillClassName }: {
  children: ReactNode;
  className?: string;
  railClassName?: string;
  fillClassName?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 70%", "end 60%"] });
  const scaleY = useSpring(scrollYProgress, { stiffness: 120, damping: 30, restDelta: 0.001 });

  return (
    <div ref={ref} className={className}>
      <span className={railClassName} aria-hidden="true">
        <motion.span className={fillClassName} style={{ scaleY: reduce ? 1 : scaleY, originY: 0 }} />
      </span>
      {children}
    </div>
  );
}
