import { ArrowRightIcon, FileTextIcon, UserCircleIcon } from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PageTransition } from "@/components/motion/PageTransition";
import { Reveal } from "@/components/motion/Reveal";
import { Tilt } from "@/components/motion/Tilt";
import { CtaBand } from "@/components/site/CtaBand";
import { ButtonLink } from "@/components/ui/Button";
import { TopicIcon } from "@/components/ui/TopicIcon";
import { TwoTone } from "@/components/ui/TwoTone";
import { getBlocks, getCapabilities, getExperience, getProcess, getSettings } from "@/lib/content";
import { mediaUrl } from "@/lib/media";
import styles from "./about.module.css";

export async function generateMetadata(): Promise<Metadata> {
  const [blocks, settings] = await Promise.all([getBlocks("about"), getSettings()]);
  return {
    title: blocks.intro.label,
    description: blocks.intro.paragraphs[0] ?? settings.seo_description,
    alternates: { canonical: "/about" },
  };
}

export default async function AboutPage() {
  const [settings, blocks, capabilities, process, experience] = await Promise.all([
    getSettings(),
    getBlocks("about"),
    getCapabilities(),
    getProcess(),
    getExperience(),
  ]);
  const portrait = mediaUrl(settings.portrait_path);
  const [lead, ...rest] = blocks.intro.paragraphs;
  const current = experience.filter((e) => !e.end_date).slice(0, 3);

  return (
    <PageTransition>
      <header className={`wrap ${styles.hero}`}>
        <div className={styles.heroText}>
          <p className="eyebrow intro-fade" style={{ "--delay": "0.05s" } as React.CSSProperties}>
            <UserCircleIcon size={14} weight="fill" aria-hidden="true" />
            {settings.display_name}
          </p>
          <h1 className={styles.title}>
            <span className="intro-line">
              <span>
                <TwoTone text={blocks.intro.label} />
              </span>
            </span>
          </h1>
          {lead ? (
            <p className={`intro-fade ${styles.lead}`} style={{ "--delay": "0.3s" } as React.CSSProperties}>
              {lead}
            </p>
          ) : null}
          {rest.length > 0 ? (
            <div className={`intro-fade ${styles.rest}`} style={{ "--delay": "0.45s" } as React.CSSProperties}>
              {rest.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          ) : null}
          <div className={`intro-fade ${styles.actions}`} style={{ "--delay": "0.55s" } as React.CSSProperties}>
            <ButtonLink href="/resume" icon="arrow-right">
              Read my resume
            </ButtonLink>
            <ButtonLink href="/contact" variant="secondary" icon="arrow-up-right">
              {blocks.cta.primary_cta}
            </ButtonLink>
          </div>
        </div>
        {portrait ? (
          <div className={styles.portraitWrap}>
            <Tilt className={styles.portrait} max={5}>
              <Image src={portrait} alt={settings.portrait_alt} fill priority sizes="(max-width: 900px) 90vw, 36vw" />
            </Tilt>
            {current.length > 0 ? (
              <div className={styles.now}>
                <span className="label">Now</span>
                <ul>
                  {current.map((e) => (
                    <li key={e.id}>
                      <span className={styles.nowDot} aria-hidden="true" />
                      {e.org}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}
      </header>

      {capabilities.length > 0 ? (
        <section className={`wrap ${styles.section}`} aria-labelledby="what-heading">
          <h2 id="what-heading" className={`section-title ${styles.sectionTitle}`}>
            <TwoTone text={blocks.what_i_do.label} />
          </h2>
          <Reveal as="ul" className={styles.capabilities} stagger>
            {capabilities.map((c) => (
              <li key={c.id} className={styles.capability}>
                <span className={styles.capIcon}>
                  <TopicIcon title={c.title} size={26} />
                </span>
                <h3 className={styles.capTitle}>{c.title}</h3>
                <p>{c.body}</p>
              </li>
            ))}
          </Reveal>
        </section>
      ) : null}

      {process.length > 0 ? (
        <section id="process" className={`wrap ${styles.section}`} aria-labelledby="process-heading">
          <h2 id="process-heading" className={`section-title ${styles.sectionTitle}`}>
            <TwoTone text={blocks.process.label} />
          </h2>
          <Reveal as="ol" className={styles.process} stagger>
            {process.map((step, i) => (
              <li key={step.id} className={styles.step}>
                <span className={styles.stepTop}>
                  <span className={styles.stepIcon}>
                    <TopicIcon title={step.title} size={24} />
                  </span>
                  <span className={styles.stepNumber} aria-hidden="true">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </span>
                <h3 className={styles.stepTitle}>{step.title}</h3>
                <p className={styles.stepBody}>{step.body}</p>
              </li>
            ))}
          </Reveal>
        </section>
      ) : null}

      <section className={`wrap ${styles.section}`} aria-label="Resume">
        <Reveal>
          <Link href="/resume" className={styles.resumeCard}>
            <span className={styles.resumeIcon}>
              <FileTextIcon size={32} weight="duotone" aria-hidden="true" />
            </span>
            <span className={styles.resumeText}>
              <strong>Experience, skills and the full CV</strong>
              <span>
                {experience.length} roles, the tools I use, and a copy you can download.
              </span>
            </span>
            <span className={styles.resumeArrow} aria-hidden="true">
              <ArrowRightIcon size={22} weight="bold" />
            </span>
          </Link>
        </Reveal>
      </section>

      <CtaBand
        heading={blocks.cta.heading}
        primary={{ label: blocks.cta.primary_cta, href: "/contact" }}
        secondary={{ label: blocks.cta.secondary_cta, href: "/work" }}
        settings={settings}
      />
    </PageTransition>
  );
}
