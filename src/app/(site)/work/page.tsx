import type { Metadata } from "next";
import { PageTransition } from "@/components/motion/PageTransition";
import { Reveal } from "@/components/motion/Reveal";
import { CtaBand } from "@/components/site/CtaBand";
import { ProjectGrid } from "@/components/site/ProjectGrid";
import { TwoTone } from "@/components/ui/TwoTone";
import { getBlocks, getProjects, getSettings } from "@/lib/content";
import { toProjectItem } from "@/lib/format";
import { SITE_URL } from "@/lib/env";
import { mediaUrl } from "@/lib/media";
import { breadcrumbs, jsonLd, pageMetadata, PERSON_ID } from "@/lib/seo";
import styles from "../page.module.css";

export async function generateMetadata(): Promise<Metadata> {
  const [blocks, settings] = await Promise.all([getBlocks("work"), getSettings()]);
  return pageMetadata({
    settings,
    title: blocks.header.label,
    description: blocks.header.intro || `Selected projects by ${settings.full_name}.`,
    path: "/work",
    card: blocks.header.label,
    kicker: "Selected projects",
  });
}

export default async function WorkPage() {
  const [settings, blocks, projects] = await Promise.all([getSettings(), getBlocks("work"), getProjects()]);

  const structured = jsonLd([
    {
      "@type": "CollectionPage",
      url: new URL("/work", SITE_URL).toString(),
      name: blocks.header.label,
      description: blocks.header.intro || undefined,
      mainEntity: {
        "@type": "ItemList",
        itemListElement: projects.map((p, i) => {
          const image = mediaUrl(p.image_path);
          return {
            "@type": "ListItem",
            position: i + 1,
            item: {
              "@type": "CreativeWork",
              name: p.title,
              description: p.summary,
              url: p.live_url || undefined,
              image: image ? new URL(image, SITE_URL).toString() : undefined,
              keywords: p.tags.join(", "),
              creator: { "@id": PERSON_ID },
            },
          };
        }),
      },
    },
    breadcrumbs([{ name: blocks.header.label, path: "/work" }]),
  ]);

  return (
    <PageTransition>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: structured }} />
      <header className={`wrap ${styles.header}`}>
        <h1 className={styles.title}>
          <span className="intro-line">
            <span>
              <TwoTone text={blocks.header.label} />
            </span>
          </span>
        </h1>
        {blocks.header.intro ? <p className={`intro-fade ${styles.lead}`}>{blocks.header.intro}</p> : null}
      </header>

      <section className={`wrap ${styles.section}`} aria-label="Projects">
        <Reveal>
          <ProjectGrid projects={projects.map(toProjectItem)} headingLevel={2} filters />
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
