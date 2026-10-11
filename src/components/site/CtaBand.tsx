import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import type { Settings } from "@/lib/content";
import styles from "./CtaBand.module.css";

type Props = {
  heading: string;
  primary: { label: string; href: string };
  secondary?: { label: string; href: string };
  settings: Settings;
};

// The one place the ink runs as a field: a poster-style close on every page.
export function CtaBand({ heading, primary, secondary, settings }: Props) {
  const whatsapp = settings.whatsapp ? `https://wa.me/${settings.whatsapp.replace(/\D/g, "")}` : null;
  return (
    <section className={styles.band} aria-labelledby="cta-heading">
      <div className={`wrap ${styles.inner}`}>
        <h2 id="cta-heading" className={styles.heading}>
          {heading}
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
          <dl className={styles.contacts}>
            <div>
              <dt className="label">Email</dt>
              <dd>
                <a href={`mailto:${settings.email}`}>
                  <Icon name="mail" size={16} />
                  {settings.email}
                </a>
              </dd>
            </div>
            {whatsapp ? (
              <div>
                <dt className="label">WhatsApp</dt>
                <dd>
                  <a href={whatsapp} target="_blank" rel="noopener">
                    <Icon name="message-circle" size={16} />
                    {settings.phone}
                  </a>
                </dd>
              </div>
            ) : null}
          </dl>
        </div>
      </div>
    </section>
  );
}
