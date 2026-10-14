import type { ReactNode } from "react";
import { PageTransition } from "@/components/motion/PageTransition";
import { RichText } from "@/components/site/RichText";
import shared from "@/app/(site)/page.module.css";

type Props = { title: string; updated: string; body: string; /** Shown between the heading and the text. */ preface?: ReactNode };

export function LegalPage({ title, updated, body, preface }: Props) {
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
      {preface ? <div className={`wrap ${shared.preface}`}>{preface}</div> : null}
      <section className={`wrap ${shared.section}`} aria-label={title}>
        <RichText source={body} />
      </section>
    </PageTransition>
  );
}
