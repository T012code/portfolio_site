import { ChatCircleDotsIcon, EnvelopeSimpleIcon, SparkleIcon } from "@phosphor-icons/react/ssr";
import { Reveal } from "@/components/motion/Reveal";
import { ButtonLink } from "@/components/ui/Button";
import type { Settings } from "@/lib/content";
import { whatsappUrl } from "@/lib/format";
import styles from "./CtaBand.module.css";

type Props = {
  heading: string;
  primary: { label: string; href: string };
  secondary?: { label: string; href: string };
  settings: Settings;
};

// Splits a heading so its last word carries the lime spark.
function splitLast(text: string) {
  const i = text.trimEnd().lastIndexOf(" ");
  return i === -1 ? ["", text] : [text.slice(0, i + 1), text.slice(i + 1)];
}

// The midnight close on every page: one rounded field, a slow-turning spark, two ways to reach out.
export function CtaBand({ heading, primary, secondary, settings }: Props) {
  const whatsapp = whatsappUrl(settings.whatsapp);
  const [lead, last] = splitLast(heading);
  return (
    <section className={`wrap ${styles.outer}`} aria-labelledby="cta-heading">
      <Reveal className={styles.band}>
        <span className={styles.glow} aria-hidden="true" />
        <SparkleIcon className={styles.spark} size={72} weight="fill" aria-hidden="true" />
        <h2 id="cta-heading" className={styles.heading}>
          {lead}
          <span className={styles.last}>{last}</span>
        </h2>
        <div className={styles.row}>
          <div className={styles.buttons}>
            <ButtonLink href={primary.href} variant="inverse" icon="arrow-up-right">
              {primary.label}
            </ButtonLink>
            {secondary ? (
              <ButtonLink href={secondary.href} variant="ghost" className={styles.ghost}>
                {secondary.label}
              </ButtonLink>
            ) : null}
          </div>
          <ul className={styles.contacts}>
            <li>
              <a href={`mailto:${settings.email}`} className={styles.contact}>
                <span className={styles.contactIcon}>
                  <EnvelopeSimpleIcon size={18} weight="duotone" aria-hidden="true" />
                </span>
                {settings.email}
              </a>
            </li>
            {whatsapp ? (
              <li>
                <a href={whatsapp} target="_blank" rel="noopener" className={styles.contact}>
                  <span className={styles.contactIcon}>
                    <ChatCircleDotsIcon size={18} weight="duotone" aria-hidden="true" />
                  </span>
                  WhatsApp {settings.phone}
                </a>
              </li>
            ) : null}
          </ul>
        </div>
      </Reveal>
    </section>
  );
}
