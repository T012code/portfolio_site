import type { Metadata } from "next";
import { PageTransition } from "@/components/motion/PageTransition";
import { Reveal } from "@/components/motion/Reveal";
import { CtaBand } from "@/components/site/CtaBand";
import { ProjectList } from "@/components/site/ProjectList";
import { getBlocks, getProjects, getSettings } from "@/lib/content";
import { toProjectItem } from "@/lib/format";
import styles from "../page.module.css";

export async function generateMetadata(): Promise<Metadata> {
  const blocks = await getBlocks("work");
  return { title: blocks.header.label, description: blocks.header.intro || undefined };
}

export default async function WorkPage() {
  const [settings, blocks, projects] = await Promise.all([getSettings(), getBlocks("work"), getProjects()]);

  return (
    <PageTransition>
      <header className={`wrap ${styles.header}`}>
        <h1 className={styles.title}>
          <span className="intro-line">
            <span>{blocks.header.label}</span>
          </span>
        </h1>
        {blocks.header.intro ? <p className={`intro-fade ${styles.lead}`}>{blocks.header.intro}</p> : null}
      </header>

      <section className={`wrap ${styles.section}`} aria-label="Projects">
        <Reveal>
          <ProjectList projects={projects.map(toProjectItem)} headingLevel={2} />
        </Reveal>
      </section>

      <CtaBand
        heading={blocks.cta.heading}
        primary={{ label: blocks.cta.primary_cta, href: "/contact" }}
        settings={settings}
      />
    </PageTransition>
  );
}
