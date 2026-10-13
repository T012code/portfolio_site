import type { Metadata } from "next";
import { TwoTone } from "@/components/ui/TwoTone";
import { PageTransition } from "@/components/motion/PageTransition";
import { Reveal } from "@/components/motion/Reveal";
import { CtaBand } from "@/components/site/CtaBand";
import { getBlocks, getFaqs, getSettings } from "@/lib/content";
import shared from "../page.module.css";
import styles from "./faq.module.css";

export async function generateMetadata(): Promise<Metadata> {
  const blocks = await getBlocks("faq");
  return { title: "FAQ", description: blocks.header.intro || undefined, alternates: { canonical: "/faq" } };
}

export default async function FaqPage() {
  const [settings, blocks, faqs] = await Promise.all([getSettings(), getBlocks("faq"), getFaqs()]);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };

  return (
    <PageTransition>
      <script
        type="application/ld+json"
        // JSON-LD must be inline; "<" is escaped so content can't close the tag.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <header className={`wrap ${shared.header}`}>
        <h1 className={shared.title}>
          <span className="intro-line">
            <span>
              <TwoTone text={blocks.header.label} />
            </span>
          </span>
        </h1>
        {blocks.header.intro ? <p className={`intro-fade ${shared.lead}`}>{blocks.header.intro}</p> : null}
      </header>

      <section className={`wrap ${shared.section}`} aria-label="Questions">
        <Reveal as="ul" className={styles.list} stagger>
          {faqs.map((f) => (
            <li key={f.id}>
              <details className={styles.item}>
                <summary className={styles.question}>
                  <h2 className={styles.questionText}>{f.question}</h2>
                  {/* A plus that turns into a minus as the answer opens. */}
                  <span className={styles.toggle} aria-hidden="true" />
                </summary>
                <div className={styles.answer}>
                  {f.answer.split(/\n{2,}/).map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
              </details>
            </li>
          ))}
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
