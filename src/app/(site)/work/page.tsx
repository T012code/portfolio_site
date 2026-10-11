import type { Metadata } from "next";
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
    <>
      <header className={`wrap ${styles.header}`}>
        <h1 className={styles.title}>{blocks.header.label}</h1>
        {blocks.header.intro ? <p className={styles.lead}>{blocks.header.intro}</p> : null}
      </header>

      <section className={`wrap ${styles.section}`} aria-label="Projects">
        <ProjectList projects={projects.map(toProjectItem)} headingLevel={2} />
      </section>

      <CtaBand
        heading={blocks.cta.heading}
        primary={{ label: blocks.cta.primary_cta, href: "/contact" }}
        settings={settings}
      />
    </>
  );
}
