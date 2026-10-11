import { PageTransition } from "@/components/motion/PageTransition";
import { RichText } from "@/components/site/RichText";
import shared from "@/app/(site)/page.module.css";

export function LegalPage({ title, updated, body }: { title: string; updated: string; body: string }) {
  return (
    <PageTransition>
      <header className={`wrap ${shared.header}`}>
        <h1 className={shared.title}>
          <span className="intro-line">
            <span>{title}</span>
          </span>
        </h1>
        {updated ? <p className={`label intro-fade`}>Last updated {updated}</p> : null}
      </header>
      <section className={`wrap ${shared.section}`} aria-label={title}>
        <RichText source={body} />
      </section>
    </PageTransition>
  );
}
