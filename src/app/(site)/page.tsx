import {
  ArrowRightIcon,
  BriefcaseIcon,
  CalendarCheckIcon,
  FolderSimpleStarIcon,
  GithubLogoIcon,
  LinkedinLogoIcon,
  SparkleIcon,
  WrenchIcon,
} from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { CountUp } from "@/components/motion/CountUp";
import { HeroPortrait } from "@/components/motion/HeroPortrait";
import { Magnetic } from "@/components/motion/Magnetic";
import { PageTransition } from "@/components/motion/PageTransition";
import { Reveal } from "@/components/motion/Reveal";
import { Ribbon } from "@/components/motion/Ribbon";
import { CtaBand } from "@/components/site/CtaBand";
import { ProjectGrid } from "@/components/site/ProjectGrid";
import { ButtonLink } from "@/components/ui/Button";
import { TechIcon } from "@/components/ui/TechIcon";
import { TopicIcon } from "@/components/ui/TopicIcon";
import { TwoTone } from "@/components/ui/TwoTone";
import { getBlocks, getCapabilities, getExperience, getProjects, getSettings, getSkills, getToday } from "@/lib/content";
import { toProjectItem, yearsSince } from "@/lib/format";
import { mediaUrl } from "@/lib/media";
import { SITE_URL } from "@/lib/env";
import styles from "./home.module.css";

// Stack chips that float around the hero portrait, in this order when the skill exists.
const HERO_STACK = ["React", "Next.js", "WordPress", "Flutter", "Supabase", "Node.js", "PHP"];

export default async function HomePage() {
  const [settings, blocks, about, projects, capabilities, skills, experience, today] = await Promise.all([
    getSettings(),
    getBlocks("home"),
    getBlocks("about"),
    getProjects(),
    getCapabilities(),
    getSkills(),
    getExperience(),
    getToday(),
  ]);
  const featured = projects.filter((p) => p.featured).slice(0, 3);
  const shown = (featured.length > 0 ? featured : projects.slice(0, 3)).map(toProjectItem);
  const portrait = mediaUrl(settings.portrait_path);
  const years = yearsSince(experience, today);
  const skillNames = skills.map((s) => s.name);
  const heroStack = [
    ...HERO_STACK.filter((n) => skillNames.includes(n)),
    ...skillNames.filter((n) => !HERO_STACK.includes(n)),
  ].slice(0, 5);
  const lines = blocks.hero.lines;
  const stats = [
    { value: years, suffix: "+", label: "Years building for the web", icon: CalendarCheckIcon },
    { value: projects.length, label: "Selected projects", icon: FolderSimpleStarIcon },
    { value: experience.length, label: "Roles and contracts", icon: BriefcaseIcon },
    { value: skills.length, label: "Tools in my kit", icon: WrenchIcon },
  ].filter((s) => s.value > 0);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: settings.full_name,
    alternateName: settings.display_name,
    jobTitle: settings.taglines[0] ?? "Software engineer",
    url: SITE_URL,
    email: `mailto:${settings.email}`,
    image: portrait ? new URL(portrait, SITE_URL).toString() : undefined,
    address: { "@type": "PostalAddress", addressLocality: "Lagos", addressCountry: "NG" },
    sameAs: [settings.linkedin_url, settings.github_url].filter(Boolean),
    knowsAbout: skillNames,
  };

  return (
    <PageTransition>
      <script
        type="application/ld+json"
        // JSON-LD must be inline; "<" is escaped so content can't close the tag.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <section className={`wrap ${styles.hero}`} aria-labelledby="hero-heading">
        <div className={styles.heroText}>
          <p className={`eyebrow intro-fade ${styles.motto}`} style={{ "--delay": "0.1s" } as React.CSSProperties}>
            <SparkleIcon size={14} weight="fill" aria-hidden="true" />
            {settings.motto}
          </p>
          <h1 id="hero-heading" className={styles.headline}>
            {lines.map((line, i) => (
              <span
                key={i}
                className={`intro-line ${i === lines.length - 1 ? "tone" : ""}`}
                style={{ "--line": i } as React.CSSProperties}
              >
                <span>{line}</span>{" "}
              </span>
            ))}
          </h1>
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
            <ul className={styles.socials}>
              {settings.github_url ? (
                <li>
                  <a href={settings.github_url} target="_blank" rel="me noopener" aria-label="GitHub">
                    <GithubLogoIcon size={20} weight="duotone" aria-hidden="true" />
                  </a>
                </li>
              ) : null}
              {settings.linkedin_url ? (
                <li>
                  <a href={settings.linkedin_url} target="_blank" rel="me noopener" aria-label="LinkedIn">
                    <LinkedinLogoIcon size={20} weight="duotone" aria-hidden="true" />
                  </a>
                </li>
              ) : null}
              <li className={styles.location}>
                <span className={styles.dot} aria-hidden="true" />
                {settings.location}
              </li>
            </ul>
          </div>
        </div>
        <div className={styles.heroVisual}>
          <HeroPortrait
            portrait={portrait}
            alt={settings.portrait_alt}
            chips={heroStack.map((name) => ({
              key: name,
              node: (
                <>
                  <TechIcon name={name} size={18} />
                  {name}
                </>
              ),
            }))}
            sticker={
              years > 0 ? (
                <span className={styles.sticker}>
                  <strong>{years}+</strong>
                  <span>years shipping</span>
                </span>
              ) : null
            }
          />
        </div>
      </section>

      {skills.length > 0 ? (
        <div className={styles.ribbons}>
          <Ribbon className={`${styles.ribbon} ${styles.ribbonBack}`} speed={1.6}>
            {skills.map((s) => (
              <span key={s.id} className={styles.ribbonItem}>
                {s.name}
                <SparkleIcon size={16} weight="fill" aria-hidden="true" />
              </span>
            ))}
          </Ribbon>
          <Ribbon className={`${styles.ribbon} ${styles.ribbonFront}`} label="Tools I use">
            {skills.map((s) => (
              <span key={s.id} className={styles.ribbonItem}>
                <TechIcon name={s.name} size={22} />
                {s.name}
              </span>
            ))}
          </Ribbon>
        </div>
      ) : null}

      <section className={`wrap ${styles.section}`} aria-labelledby="intro-heading">
        <Reveal as="ul" className={styles.bento} stagger>
          <li className={styles.introCard}>
            <h2 id="intro-heading" className="eyebrow">
              {about.intro.label}
            </h2>
            {about.intro.paragraphs[0] ? <p className={styles.introLead}>{about.intro.paragraphs[0]}</p> : null}
            <div className={styles.ctas}>
              <ButtonLink href="/resume" icon="arrow-right">
                Read my resume
              </ButtonLink>
              <ButtonLink href="/about" variant="ghost">
                {blocks.cta.secondary_cta}
              </ButtonLink>
            </div>
          </li>
          {stats.map(({ value, suffix, label, icon: Glyph }) => (
            <li key={label} className={styles.stat}>
              <span className={styles.statIcon}>
                <Glyph size={22} weight="duotone" aria-hidden="true" />
              </span>
              <span className={styles.statValue}>
                <CountUp value={value} suffix={suffix} />
              </span>
              <span className={styles.statLabel}>{label}</span>
            </li>
          ))}
        </Reveal>
      </section>

      <section className={`wrap ${styles.section}`} aria-labelledby="featured-heading">
        <div className={styles.sectionHead}>
          <h2 id="featured-heading" className="section-title">
            <TwoTone text={blocks.featured.label} />
          </h2>
          <Link href="/work" className={styles.more}>
            {blocks.featured.link}
            <span className={styles.moreIcon}>
              <ArrowRightIcon size={16} weight="bold" aria-hidden="true" />
            </span>
          </Link>
        </div>
        <Reveal>
          <ProjectGrid projects={shown} />
        </Reveal>
      </section>

      {capabilities.length > 0 ? (
        <section className={`wrap ${styles.section}`} aria-labelledby="what-heading">
          <div className={styles.sectionHead}>
            <h2 id="what-heading" className="section-title">
              <TwoTone text={blocks.what_i_do.label} />
            </h2>
            <Link href="/about#process" className={styles.more}>
              {blocks.what_i_do.link}
              <span className={styles.moreIcon}>
                <ArrowRightIcon size={16} weight="bold" aria-hidden="true" />
              </span>
            </Link>
          </div>
          <Reveal as="ul" className={styles.services} stagger>
            {capabilities.map((c) => (
              <li key={c.id} className={styles.service}>
                <span className={styles.serviceIcon}>
                  <TopicIcon title={c.title} size={26} />
                </span>
                <h3 className={styles.serviceTitle}>{c.title}</h3>
                <p className={styles.serviceBody}>{c.short_body}</p>
              </li>
            ))}
          </Reveal>
        </section>
      ) : null}

      <CtaBand
        heading={blocks.cta.heading}
        primary={{ label: blocks.cta.primary_cta, href: "/contact" }}
        secondary={{ label: "Read my resume", href: "/resume" }}
        settings={settings}
      />
    </PageTransition>
  );
}
