"use client";

import { useEffect, useRef, type ReactNode } from "react";

type Props = {
  as?: "div" | "ul" | "ol" | "section";
  children: ReactNode;
  className?: string;
  /** Stagger direct children instead of revealing the block as one. */
  stagger?: boolean;
  delay?: number;
};

// Fades content up as it enters the viewport. Styles live in globals.css under [data-reveal];
// without JavaScript (or with reduced motion) content is simply shown.
export function Reveal({ as = "div", children, className, stagger, delay = 0 }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  // All allowed tags share the same props we pass; type them as div for the ref.
  const Tag = as as "div";

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.setAttribute("data-inview", "");
            observer.unobserve(entry.target);
          }
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.05 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      className={className}
      data-reveal={stagger ? "stagger" : ""}
      style={delay ? ({ "--reveal-delay": `${delay}ms` } as React.CSSProperties) : undefined}
    >
      {children}
    </Tag>
  );
}
