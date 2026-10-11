import Image from "next/image";
import Link from "next/link";
import { Magnetic } from "@/components/motion/Magnetic";
import { PageTransition } from "@/components/motion/PageTransition";
import { Reveal } from "@/components/motion/Reveal";
import { CtaBand } from "@/components/site/CtaBand";
import { ProjectList } from "@/components/site/ProjectList";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { HeroVisual } from "@/components/three/HeroVisual";
import { getBlocks, getCapabilities, getProjects, getSettings, getSkills } from "@/lib/content";
import { toProjectItem } from "@/lib/format";
import { mediaUrl } from "@/lib/media";
import styles from "./home.module.css";

export default async function HomePage() {
  const [settings, blocks, about, projects, capabilities, skills] = await Promise.all([
    getSettings(),
    getBlocks("home"),
    getBlocks("about"),
    getProjects(),
    getCapabilities(),
    getSkills(),
  ]);
  const featured = projects.filter((p) => p.featured).slice(0, 3);
  const shown = (featured.length > 0 ? featured : projects.slice(0, 3)).map(toProjectItem);
  const portrait = mediaUrl(settings.portrait_path);

  return (
    <PageTransition>
      <section className={`wrap ${styles.hero}`} aria-labelledby="hero-heading">
        <h1 id="hero-heading" className={styles.headline}>
          {blocks.hero.lines.map((line, i) => (
            <span key={i} className={`intro-line ${styles.line}`} style={{ "--line": i } as React.CSSProperties}>
              <span>{line}</span>{" "}
            </span>
          ))}
        </h1>
        <HeroVisual className={`intro-fade ${styles.visual}`} />
        <div className={`intro-fade ${styles.heroFoot}`} style={{ "--delay": "0.55s" } as React.CSSProperties}>
          <p className={styles.roleLine}>{settings.role_line}</p>
          <div className={styles.ctas}>
            <Magnetic>
              <ButtonLink href="/contact" icon="arrow-up-right">
                {blocks.hero.primary_cta}
              </ButtonLink>
            </Magnetic>
            <Magnetic>
              <ButtonLink href="/work" variant="secondary">
                {blocks.hero.secondary_cta}
              </ButtonLink>
            </Magnetic>
          </div>
        </div>
      </section>

      {skills.length > 0 ? (
        <div className={styles.ticker} aria-label="Tools I use">
          <ul className={styles.tickerTrack}>
            {[...skills, ...skills].map((s, i) => (
              <li key={`${s.id}-${i}`} aria-hidden={i >= skills.length || undefined}>
                {s.name}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <section className={`wrap ${styles.section}`} aria-labelledby="featured-heading">
        <div className={styles.sectionHead}>
          <h2 id="featured-heading" className="label">
            {blocks.featured.label}
          </h2>
          <Link href="/work" className={styles.more}>
            {blocks.featured.link} <Icon name="arrow-right" size={16} />
          </Link>
        </div>
        <Reveal>
          <ProjectList projects={shown} />
        </Reveal>
      </section>

      <section className={`wrap ${styles.section} ${styles.intro}`} aria-labelledby="intro-heading">
        {portrait ? (
          <Reveal className={styles.portrait}>
            <Image src={portrait} alt={settings.portrait_alt} fill sizes="(max-width: 760px) 100vw, 40vw" />
          </Reveal>
        ) : null}
        <Reveal className={styles.introText} delay={120}>
          <h2 id="intro-heading" className="label">
            {about.intro.label}
          </h2>
          {about.intro.paragraphs[0] ? <p className={styles.introLead}>{about.intro.paragraphs[0]}</p> : null}
          <ButtonLink href="/about" variant="secondary">
            {blocks.cta.secondary_cta}
          </ButtonLink>
        </Reveal>
      </section>

      <section className={`wrap ${styles.section}`} aria-labelledby="what-heading">
        <div className={styles.sectionHead}>
          <h2 id="what-heading" className="label">
            {blocks.what_i_do.label}
          </h2>
          <Link href="/about#process" className={styles.more}>
            {blocks.what_i_do.link} <Icon name="arrow-right" size={16} />
          </Link>
        </div>
        <Reveal as="ul" className={styles.cells} stagger>
          {capabilities.map((c) => (
            <li key={c.id} className={styles.cell}>
              <h3 className={styles.cellTitle}>{c.title}</h3>
              <p className={styles.cellBody}>{c.short_body}</p>
            </li>
          ))}
        </Reveal>
      </section>

      <CtaBand
        heading={blocks.cta.heading}
        primary={{ label: blocks.cta.primary_cta, href: "/contact" }}
        secondary={{ label: blocks.cta.secondary_cta, href: "/about" }}
        settings={settings}
      />
    </PageTransition>
  );
}
