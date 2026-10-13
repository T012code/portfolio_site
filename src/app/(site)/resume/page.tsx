import {
  BriefcaseIcon,
  CalendarBlankIcon,
  EnvelopeSimpleIcon,
  GithubLogoIcon,
  LinkedinLogoIcon,
  MapPinIcon,
  PhoneIcon,
  SealCheckIcon,
} from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import { HangingBadge } from "@/components/motion/HangingBadge";
import { PageTransition } from "@/components/motion/PageTransition";
import { Reveal } from "@/components/motion/Reveal";
import { Timeline } from "@/components/motion/Timeline";
import { CtaBand } from "@/components/site/CtaBand";
import { PrintButton } from "@/components/site/PrintButton";
import { ButtonAnchor, ButtonLink } from "@/components/ui/Button";
import { TagList } from "@/components/ui/Tag";
import { TechIcon } from "@/components/ui/TechIcon";
import { TopicIcon } from "@/components/ui/TopicIcon";
import { TwoTone } from "@/components/ui/TwoTone";
import { getBlocks, getExperience, getServices, getSettings, getSkills, getToday } from "@/lib/content";
import { experienceRange, whatsappUrl, yearsSince } from "@/lib/format";
import { SITE_URL } from "@/lib/env";
import { mediaUrl } from "@/lib/media";
import { pageMetadata } from "@/lib/seo";
import { breadcrumbs, jsonLd, personNode } from "@/lib/seo";
import styles from "./resume.module.css";

export async function generateMetadata(): Promise<Metadata> {
  const [blocks, settings] = await Promise.all([getBlocks("resume"), getSettings()]);
  return pageMetadata({
    settings,
    title: blocks.header.label,
    description: `${settings.full_name}: ${blocks.header.headline} Experience, skills, services and a downloadable CV.`,
    path: "/resume",
    card: settings.full_name,
    kicker: blocks.header.label,
    type: "profile",
  });
}

export default async function ResumePage() {
  const [settings, blocks, about, experience, skills, services, today] = await Promise.all([
    getSettings(),
    getBlocks("resume"),
    getBlocks("about"),
    getExperience(),
    getSkills(),
    getServices(),
    getToday(),
  ]);
  const portrait = mediaUrl(settings.portrait_path);
  // Browsers ignore `download` across origins; Supabase serves an attachment with ?download.
  const cvUrl = mediaUrl(settings.cv_path);
  const cv = cvUrl && !cvUrl.startsWith("/") ? `${cvUrl}?download=Laniya-Molayoninujesu-CV.pdf` : cvUrl;
  const years = yearsSince(experience, today);
  const write = blocks.summary.paragraphs.length > 0 ? blocks.summary.paragraphs : about.intro.paragraphs;
  const whatsapp = whatsappUrl(settings.whatsapp);
  const role = settings.taglines[0] ?? "Software engineer";

  const contacts = [
    { icon: EnvelopeSimpleIcon, label: settings.email, href: `mailto:${settings.email}` },
    settings.phone ? { icon: PhoneIcon, label: settings.phone, href: whatsapp ?? `tel:${settings.phone.replace(/\s/g, "")}` } : null,
    { icon: MapPinIcon, label: settings.location, href: null },
    settings.linkedin_url
      ? { icon: LinkedinLogoIcon, label: settings.linkedin_url.replace(/^https?:\/\/(www\.)?/, ""), href: settings.linkedin_url }
      : null,
    settings.github_url
      ? { icon: GithubLogoIcon, label: settings.github_url.replace(/^https?:\/\/(www\.)?/, ""), href: settings.github_url }
      : null,
  ].filter((c) => c !== null);

  const structured = jsonLd([
    {
      "@type": "ProfilePage",
      url: new URL("/resume", SITE_URL).toString(),
      name: `${blocks.header.label}: ${settings.full_name}`,
      mainEntity: personNode(settings, {
        description: write[0],
        knowsAbout: skills.map((s) => s.name),
        hasOccupation: { "@type": "Occupation", name: role, occupationLocation: { "@type": "City", name: "Lagos" } },
        worksFor: experience
          .filter((e) => !e.end_date)
          .map((e) => ({ "@type": "Organization", name: e.org })),
      }),
    },
    breadcrumbs([{ name: blocks.header.label, path: "/resume" }]),
  ]);

  return (
    <PageTransition>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: structured }} />
      <header className={`wrap ${styles.hero}`}>
        <div className={styles.heroText}>
          <p className="eyebrow intro-fade" style={{ "--delay": "0.05s" } as React.CSSProperties}>
            <SealCheckIcon size={14} weight="fill" aria-hidden="true" />
            {blocks.header.label}
          </p>
          <h1 className={styles.name}>
            <span className="intro-line">
              <span>{settings.full_name}</span>
            </span>
          </h1>
          <p className={`intro-fade ${styles.headline}`} style={{ "--delay": "0.3s" } as React.CSSProperties}>
            <TwoTone text={blocks.header.headline} count={2} />
          </p>
          <ul className={`intro-fade ${styles.facts}`} style={{ "--delay": "0.45s" } as React.CSSProperties}>
            <li>
              <MapPinIcon size={16} weight="duotone" aria-hidden="true" />
              {settings.location}
            </li>
            {years > 0 ? (
              <li>
                <CalendarBlankIcon size={16} weight="duotone" aria-hidden="true" />
                {years}+ years experience
              </li>
            ) : null}
            <li>
              <BriefcaseIcon size={16} weight="duotone" aria-hidden="true" />
              {experience.length} roles
            </li>
          </ul>
          <div className={`intro-fade ${styles.actions}`} style={{ "--delay": "0.55s" } as React.CSSProperties}>
            {cv ? (
              <ButtonAnchor href={cv} icon="download" download>
                {blocks.header.cv_label}
              </ButtonAnchor>
            ) : null}
            <PrintButton label={blocks.header.print_label} variant={cv ? "secondary" : "primary"} />
            <ButtonLink href="/contact" variant="ghost" icon="arrow-up-right">
              Book a call
            </ButtonLink>
          </div>
        </div>
        <div className={styles.badge}>
          <HangingBadge
            portrait={portrait}
            portraitAlt={settings.portrait_alt}
            name={settings.display_name}
            fullName={settings.full_name}
            role={role}
            location={settings.location}
            email={settings.email}
            back={
              <>
                <span className={styles.backTitle}>Stack I reach for</span>
                <span className={styles.backIcons}>
                  {skills.slice(0, 9).map((s) => (
                    <span key={s.id} title={s.name}>
                      <TechIcon name={s.name} size={22} />
                    </span>
                  ))}
                </span>
                <span className={styles.backFact}>
                  <strong>{years}+</strong> years building for the web
                </span>
              </>
            }
          />
        </div>
      </header>

      <div className={`wrap ${styles.body}`}>
        <aside className={styles.aside}>
          <section className={styles.panel} aria-labelledby="contact-heading">
            <h2 id="contact-heading" className="label">
              {blocks.sections.contact}
            </h2>
            <ul className={styles.contacts}>
              {contacts.map(({ icon: Glyph, label, href }) => (
                <li key={label}>
                  <span className={styles.contactIcon}>
                    <Glyph size={18} weight="duotone" aria-hidden="true" />
                  </span>
                  {href ? (
                    <a href={href} {...(href.startsWith("http") ? { target: "_blank", rel: "noopener" } : {})}>
                      {label}
                    </a>
                  ) : (
                    <span>{label}</span>
                  )}
                </li>
              ))}
            </ul>
          </section>

          {skills.length > 0 ? (
            <section className={styles.panel} aria-labelledby="skills-heading">
              <h2 id="skills-heading" className="label">
                {blocks.sections.skills}
              </h2>
              <Reveal as="ul" className={styles.skills} stagger>
                {skills.map((s) => (
                  <li key={s.id}>
                    <TechIcon name={s.name} size={18} />
                    {s.name}
                  </li>
                ))}
              </Reveal>
              {about.tools.note ? <p className={styles.note}>{about.tools.note}</p> : null}
            </section>
          ) : null}
        </aside>

        <div className={styles.main}>
          {write.length > 0 ? (
            <section className={styles.block} aria-labelledby="profile-heading">
              <h2 id="profile-heading" className="section-title">
                <TwoTone text={blocks.summary.label} />
              </h2>
              <Reveal className={styles.profile}>
                {write.map((p, i) => (
                  <p key={i} className={i === 0 ? styles.profileLead : undefined}>
                    {p}
                  </p>
                ))}
              </Reveal>
            </section>
          ) : null}

          {experience.length > 0 ? (
            <section className={styles.block} aria-labelledby="experience-heading">
              <h2 id="experience-heading" className="section-title">
                <TwoTone text={blocks.sections.experience} />
              </h2>
              <Timeline className={styles.timeline} railClassName={styles.rail} fillClassName={styles.railFill}>
                <ol className={styles.roles}>
                  {experience.map((e) => (
                    <li key={e.id} className={styles.role}>
                      <span className={styles.node} aria-hidden="true" data-current={!e.end_date || undefined} />
                      <Reveal className={styles.roleCard}>
                        <div className={styles.roleHead}>
                          <div>
                            <h3 className={styles.roleTitle}>{e.title}</h3>
                            <p className={styles.org}>
                              {e.org}
                              {e.meta ? <span> · {e.meta}</span> : null}
                            </p>
                          </div>
                          <p className={styles.dates} data-current={!e.end_date || undefined}>
                            {experienceRange(e)}
                          </p>
                        </div>
                        {e.summary ? <p className={styles.summary}>{e.summary}</p> : null}
                        {e.highlights ? (
                          <TagList tags={e.highlights.split("·").map((h) => h.trim()).filter(Boolean)} label="Highlights" />
                        ) : null}
                      </Reveal>
                    </li>
                  ))}
                </ol>
              </Timeline>
            </section>
          ) : null}

          {services.length > 0 ? (
            <section className={styles.block} aria-labelledby="services-heading">
              <h2 id="services-heading" className="section-title">
                <TwoTone text={blocks.sections.services} />
              </h2>
              <Reveal as="ul" className={styles.services} stagger>
                {services.map((s) => (
                  <li key={s.id} className={styles.service}>
                    <span className={styles.serviceIcon}>
                      <TopicIcon title={s.title} size={22} />
                    </span>
                    <div>
                      <h3 className={styles.serviceTitle}>{s.title}</h3>
                      <p className={styles.serviceBody}>{s.body}</p>
                      <TagList tags={s.tags} label={`${s.title} tools`} />
                    </div>
                  </li>
                ))}
              </Reveal>
            </section>
          ) : null}
        </div>
      </div>

      <div className={styles.noPrint}>
        <CtaBand
          heading={about.cta.heading}
          primary={{ label: about.cta.primary_cta, href: "/contact" }}
          secondary={{ label: about.cta.secondary_cta, href: "/work" }}
          settings={settings}
        />
      </div>
    </PageTransition>
  );
}
