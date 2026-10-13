import { ArrowUpRightIcon } from "@phosphor-icons/react/ssr";
import Image from "next/image";
import { Reveal } from "@/components/motion/Reveal";
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
  /** First card spans two columns (bento). */
  feature?: boolean;
};

// Project cards: image, title, role, summary and stack. Cards with a live site link out.
export function ProjectGrid({ projects, headingLevel = 3, feature = false }: Props) {
  const Heading = headingLevel === 2 ? "h2" : "h3";

  return (
    <Reveal as="ul" className={styles.grid} stagger>
      {projects.map((p, i) => (
        <li key={p.id} className={styles.item} data-feature={(feature && i === 0) || undefined}>
          <article className={styles.card}>
            <div className={styles.media}>
              {p.image ? (
                <Image
                  src={p.image}
                  alt={p.imageAlt}
                  fill
                  sizes={feature && i === 0 ? "(max-width: 760px) 100vw, 66vw" : "(max-width: 760px) 100vw, 33vw"}
                />
              ) : null}
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
        </li>
      ))}
    </Reveal>
  );
}
