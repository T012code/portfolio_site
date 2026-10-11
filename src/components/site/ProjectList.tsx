"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { TagList } from "@/components/ui/Tag";
import styles from "./ProjectList.module.css";

export type ProjectItem = {
  id: string;
  title: string;
  role: string;
  summary: string;
  tags: string[];
  image: string | null;
  imageAlt: string;
  url: string | null;
};

// A ruled list of projects. On fine pointers, the hovered project's image follows the cursor.
export function ProjectList({ projects, headingLevel = 3 }: { projects: ProjectItem[]; headingLevel?: 2 | 3 }) {
  const listRef = useRef<HTMLUListElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const displaceRef = useRef<SVGFEDisplacementMapElement>(null);
  const filterId = `ripple-${useId().replace(/:/g, "")}`;
  const [active, setActive] = useState<string | null>(null);
  const Heading = headingLevel === 2 ? "h2" : "h3";

  useEffect(() => {
    const list = listRef.current;
    const preview = previewRef.current;
    if (!list || !preview) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const displace = displaceRef.current;
    let frame = 0;
    let running = false;
    let ripple = 0;
    const target = { x: 0, y: 0 };
    const current = { x: 0, y: 0 };

    // Eases the preview toward the pointer; speed drives tilt and the ripple strength.
    // The loop stops itself once everything has settled.
    const render = () => {
      const k = reduce ? 1 : 0.16;
      const dx = target.x - current.x;
      const dy = target.y - current.y;
      current.x += dx * k;
      current.y += dy * k;
      const tilt = reduce ? 0 : Math.max(-8, Math.min(8, dx * 0.06));
      preview.style.transform = `translate3d(${current.x}px, ${current.y}px, 0) rotate(${tilt}deg)`;
      const speed = Math.min(Math.hypot(dx, dy), 160);
      ripple += ((reduce ? 0 : speed * 0.28) - ripple) * 0.12;
      displace?.setAttribute("scale", ripple.toFixed(2));
      if (Math.abs(dx) + Math.abs(dy) > 0.2 || ripple > 0.05) {
        frame = requestAnimationFrame(render);
      } else {
        running = false;
        displace?.setAttribute("scale", "0");
      }
    };
    const kick = () => {
      if (!running) {
        running = true;
        frame = requestAnimationFrame(render);
      }
    };

    const onMove = (e: PointerEvent) => {
      const rect = list.getBoundingClientRect();
      target.x = e.clientX - rect.left;
      target.y = e.clientY - rect.top;
      kick();
    };
    const onEnter = (e: PointerEvent) => {
      onMove(e);
      current.x = target.x;
      current.y = target.y;
    };

    list.addEventListener("pointermove", onMove);
    list.addEventListener("pointerenter", onEnter);
    return () => {
      cancelAnimationFrame(frame);
      list.removeEventListener("pointermove", onMove);
      list.removeEventListener("pointerenter", onEnter);
    };
  }, []);

  return (
    <div className={styles.wrap}>
      <ul ref={listRef} className={styles.list} onPointerLeave={() => setActive(null)}>
        {projects.map((p) => (
          <li
            key={p.id}
            className={styles.item}
            data-active={active === p.id || undefined}
            data-dimmed={(active !== null && active !== p.id) || undefined}
            onPointerEnter={() => setActive(p.id)}
            // Every row gets a label so the cursor reads the same down the list.
            data-cursor={p.url ? "Visit" : "Private"}
          >
            <article className={styles.row}>
              {p.image ? (
                <div className={styles.thumb}>
                  <Image src={p.image} alt={p.imageAlt} fill sizes="(max-width: 760px) 100vw, 1px" />
                </div>
              ) : null}
              <div className={styles.head}>
                <Heading className={styles.title}>
                  {p.url ? (
                    <a href={p.url} target="_blank" rel="noopener" className={styles.titleLink}>
                      {p.title}
                      <span className="visually-hidden"> (opens in a new tab)</span>
                    </a>
                  ) : (
                    p.title
                  )}
                </Heading>
                <p className={styles.role}>{p.role}</p>
              </div>
              <div className={styles.body}>
                <p className={styles.summary}>{p.summary}</p>
                <TagList tags={p.tags} label={`${p.title} stack`} />
              </div>
              <span className={styles.arrow} aria-hidden="true">
                {p.url ? <Icon name="arrow-up-right" size={22} /> : null}
              </span>
            </article>
          </li>
        ))}
      </ul>

      <svg width="0" height="0" aria-hidden="true" style={{ position: "absolute" }}>
        <filter id={filterId} x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.008 0.016" numOctaves="2" seed="7" result="noise" />
          <feDisplacementMap
            ref={displaceRef}
            in="SourceGraphic"
            in2="noise"
            scale="0"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </svg>
      <div
        ref={previewRef}
        className={styles.preview}
        data-visible={active !== null || undefined}
        aria-hidden="true"
        style={{ filter: `url(#${filterId})` }}
      >
        {projects.map((p) =>
          p.image ? (
            <div key={p.id} className={styles.previewFrame} data-active={active === p.id || undefined}>
              <Image src={p.image} alt="" fill sizes="28rem" />
            </div>
          ) : null,
        )}
      </div>
    </div>
  );
}
