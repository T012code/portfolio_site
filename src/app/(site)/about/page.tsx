import type { Metadata } from "next";
import Image from "next/image";
import { CtaBand } from "@/components/site/CtaBand";
import { ButtonAnchor } from "@/components/ui/Button";
import { TagList } from "@/components/ui/Tag";
import {
  getBlocks,
  getCapabilities,
  getExperience,
  getProcess,
  getServices,
  getSettings,
  getSkills,
} from "@/lib/content";
import { experienceRange } from "@/lib/format";
import { mediaUrl } from "@/lib/media";
import shared from "../page.module.css";
import styles from "./about.module.css";

export async function generateMetadata(): Promise<Metadata> {
  const [blocks, settings] = await Promise.all([getBlocks("about"), getSettings()]);
  return { title: blocks.intro.label, description: blocks.intro.paragraphs[0] ?? settings.seo_description };
}

export default async function AboutPage() {
  const [settings, blocks, capabilities, services, process, experience, skills] = await Promise.all([
    getSettings(),
    getBlocks("about"),
    getCapabilities(),
    getServices(),
    getProcess(),
    getExperience(),
    getSkills(),
  ]);
  const portrait = mediaUrl(settings.portrait_path);
  const cv = mediaUrl(settings.cv_path);

  return (
    <>
      <header className={`wrap ${shared.header} ${styles.intro}`}>
        <h1 className={`${shared.title} ${styles.introTitle}`}>{blocks.intro.label}</h1>
        <div className={styles.introBody}>
          {blocks.intro.paragraphs.map((p, i) => (
            <p key={i} className={i === 0 ? styles.introLead : undefined}>
              {p}
            </p>
          ))}
          <ul className={styles.taglines} aria-label="Roles">
            {settings.taglines.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
        {portrait ? (
          <div className={styles.portrait}>
            <Image src={portrait} alt={settings.portrait_alt} fill priority sizes="(max-width: 760px) 100vw, 34vw" />
          </div>
        ) : null}
      </header>

      <section className={`wrap ${shared.section}`} aria-labelledby="what-heading">
        <h2 id="what-heading" className={`label ${styles.sectionLabel}`}>
          {blocks.what_i_do.label}
        </h2>
        <ul className={styles.capabilities}>
          {capabilities.map((c) => (
            <li key={c.id}>
              <h3 className={styles.capTitle}>{c.title}</h3>
              <p>{c.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className={`wrap ${shared.section}`} aria-labelledby="services-heading">
        <h2 id="services-heading" className={`label ${styles.sectionLabel}`}>
          {blocks.services.label}
        </h2>
        <ul className={styles.services}>
          {services.map((s) => (
            <li key={s.id} className={styles.service}>
              <h3 className={styles.serviceTitle}>{s.title}</h3>
              <p className={styles.serviceBody}>{s.body}</p>
              <TagList tags={s.tags} label={`${s.title} tools`} />
            </li>
          ))}
        </ul>
      </section>

      <section id="process" className={`wrap ${shared.section}`} aria-labelledby="process-heading">
        <h2 id="process-heading" className={`label ${styles.sectionLabel}`}>
          {blocks.process.label}
        </h2>
        <ol className={styles.process}>
          {process.map((step, i) => (
            <li key={step.id} className={styles.step}>
              <span className={styles.stepNumber} aria-hidden="true">
                {i + 1}
              </span>
              <h3 className={styles.stepTitle}>{step.title}</h3>
              <p className={styles.stepBody}>{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className={`wrap ${shared.section}`} aria-labelledby="experience-heading">
        <div className={shared.sectionHead}>
          <h2 id="experience-heading" className="label">
            {blocks.experience.label}
          </h2>
          {cv ? (
            <ButtonAnchor href={cv} variant="secondary" icon="download" download>
              {blocks.experience.cv_label}
            </ButtonAnchor>
          ) : null}
        </div>
        <ol className={styles.timeline}>
          {experience.map((e) => (
            <li key={e.id} className={styles.role}>
              <p className={styles.dates}>{experienceRange(e)}</p>
              <div>
                <h3 className={styles.roleTitle}>{e.title}</h3>
                <p className={styles.org}>
                  {e.org}
                  {e.meta ? <span> · {e.meta}</span> : null}
                </p>
              </div>
              <div className={styles.roleBody}>
                {e.summary ? <p>{e.summary}</p> : null}
                {e.highlights ? <p className={styles.highlights}>{e.highlights}</p> : null}
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className={`wrap ${shared.section}`} aria-labelledby="tools-heading">
        <h2 id="tools-heading" className={`label ${styles.sectionLabel}`}>
          {blocks.tools.label}
        </h2>
        <ul className={styles.tools}>
          {skills.map((s) => (
            <li key={s.id}>{s.name}</li>
          ))}
        </ul>
        {blocks.tools.note ? <p className={styles.toolsNote}>{blocks.tools.note}</p> : null}
      </section>

      <CtaBand
        heading={blocks.cta.heading}
        primary={{ label: blocks.cta.primary_cta, href: "/contact" }}
        secondary={{ label: blocks.cta.secondary_cta, href: "/work" }}
        settings={settings}
      />
    </>
  );
}
