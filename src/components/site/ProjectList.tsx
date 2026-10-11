"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
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
  const [active, setActive] = useState<string | null>(null);
  const Heading = headingLevel === 2 ? "h2" : "h3";

  useEffect(() => {
    const list = listRef.current;
    const preview = previewRef.current;
    if (!list || !preview) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    const target = { x: 0, y: 0 };
    const current = { x: 0, y: 0 };

    const render = () => {
      const k = reduce ? 1 : 0.16;
      current.x += (target.x - current.x) * k;
      current.y += (target.y - current.y) * k;
      const tilt = reduce ? 0 : Math.max(-8, Math.min(8, (target.x - current.x) * 0.06));
      preview.style.transform = `translate3d(${current.x}px, ${current.y}px, 0) rotate(${tilt}deg)`;
      frame = requestAnimationFrame(render);
    };

    const onMove = (e: PointerEvent) => {
      const rect = list.getBoundingClientRect();
      target.x = e.clientX - rect.left;
      target.y = e.clientY - rect.top;
    };
    const onEnter = (e: PointerEvent) => {
      onMove(e);
      current.x = target.x;
      current.y = target.y;
    };

    list.addEventListener("pointermove", onMove);
    list.addEventListener("pointerenter", onEnter);
    frame = requestAnimationFrame(render);
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
                <Icon name={p.url ? "arrow-up-right" : "arrow-right"} size={22} />
              </span>
            </article>
          </li>
        ))}
      </ul>

      <div ref={previewRef} className={styles.preview} data-visible={active !== null || undefined} aria-hidden="true">
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
