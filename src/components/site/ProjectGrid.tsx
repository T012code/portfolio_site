"use client";

import { ArrowUpRightIcon, LockSimpleIcon } from "@phosphor-icons/react";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";
import Image from "next/image";
import { useMemo, useState } from "react";
import { Tilt } from "@/components/motion/Tilt";
import { TechIcon } from "@/components/ui/TechIcon";
import styles from "./ProjectGrid.module.css";

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

type Props = {
  projects: ProjectItem[];
  headingLevel?: 2 | 3;
  /** Show stack filter chips above the grid. */
  filters?: boolean;
  /** First card spans two columns (bento). */
  feature?: boolean;
};

const EASE = [0.22, 1, 0.36, 1] as const;

export function ProjectGrid({ projects, headingLevel = 3, filters = false, feature = false }: Props) {
  const reduce = useReducedMotion();
  const [tag, setTag] = useState<string | null>(null);
  const Heading = headingLevel === 2 ? "h2" : "h3";

  // Most-used stack tags first, so the filter row leads with what matters.
  const tags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of projects) for (const t of p.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
    return [...counts.entries()]
      .filter(([, n]) => n > 1)
      .sort((a, b) => b[1] - a[1])
      .map(([t]) => t)
      .slice(0, 6);
  }, [projects]);

  const shown = tag ? projects.filter((p) => p.tags.includes(tag)) : projects;

  return (
    <div className={styles.wrap}>
      {filters && tags.length > 0 ? (
        <LayoutGroup id="project-filters">
          <div className={styles.filters} role="group" aria-label="Filter projects by stack">
            {[null, ...tags].map((t) => {
              const active = tag === t;
              return (
                <button
                  key={t ?? "all"}
                  type="button"
                  className={styles.filter}
                  aria-pressed={active}
                  onClick={() => setTag(t)}
                >
                  {active ? (
                    <motion.span
                      layoutId="filter-pill"
                      className={styles.filterPill}
                      transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 34 }}
                    />
                  ) : null}
                  <span className={styles.filterText}>
                    {t ? <TechIcon name={t} size={14} /> : null}
                    {t ?? "All work"}
                  </span>
                </button>
              );
            })}
          </div>
        </LayoutGroup>
      ) : null}

      <motion.ul layout={!reduce} className={styles.grid} data-feature={feature || undefined}>
        <AnimatePresence mode="popLayout" initial={false}>
          {shown.map((p, i) => (
            <motion.li
              key={p.id}
              layout={!reduce}
              className={styles.item}
              initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.94 }}
              transition={{ duration: 0.5, ease: EASE, delay: reduce ? 0 : Math.min(i, 4) * 0.04 }}
              data-cursor={p.url ? "Visit" : "Private"}
            >
              <Tilt className={styles.card} max={4}>
                <article className={styles.inner}>
                  <div className={styles.media}>
                    {p.image ? (
                      <Image
                        src={p.image}
                        alt={p.imageAlt}
                        fill
                        sizes={feature && i === 0 ? "(max-width: 760px) 100vw, 66vw" : "(max-width: 760px) 100vw, 33vw"}
                      />
                    ) : null}
                    <span className={styles.badge}>
                      {p.url ? (
                        <>
                          <span className={styles.live} aria-hidden="true" />
                          Live
                        </>
                      ) : (
                        <>
                          <LockSimpleIcon size={12} weight="bold" aria-hidden="true" />
                          Private
                        </>
                      )}
                    </span>
                  </div>
                  <div className={styles.body}>
                    <div className={styles.head}>
                      <div>
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
                      {p.url ? (
                        <span className={styles.arrow} aria-hidden="true">
                          <ArrowUpRightIcon size={18} weight="bold" />
                        </span>
                      ) : null}
                    </div>
                    <p className={styles.summary}>{p.summary}</p>
                    <ul className={styles.stack} aria-label={`${p.title} stack`}>
                      {p.tags.map((t) => (
                        <li key={t} title={t}>
                          <TechIcon name={t} size={14} />
                          {t}
                        </li>
                      ))}
                    </ul>
                  </div>
                </article>
              </Tilt>
            </motion.li>
          ))}
        </AnimatePresence>
      </motion.ul>
    </div>
  );
}
