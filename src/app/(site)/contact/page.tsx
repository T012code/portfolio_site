import type { Metadata } from "next";
import { ButtonAnchor } from "@/components/ui/Button";
import { Icon, type IconName } from "@/components/ui/Icon";
import { getBlocks, getSettings } from "@/lib/content";
import { whatsappUrl } from "@/lib/format";
import shared from "../page.module.css";
import styles from "./contact.module.css";

export async function generateMetadata(): Promise<Metadata> {
  const blocks = await getBlocks("contact");
  return { title: blocks.header.label, description: blocks.header.intro || undefined };
}

export default async function ContactPage() {
  const [settings, blocks] = await Promise.all([getSettings(), getBlocks("contact")]);
  const whatsapp = whatsappUrl(settings.whatsapp);
  const calUrl = settings.cal_link ? `https://cal.com/${settings.cal_link}` : null;

  const methods: { icon: IconName; label: string; value: string; href: string; external?: boolean }[] = [
    { icon: "mail", label: "Email", value: settings.email, href: `mailto:${settings.email}` },
    ...(whatsapp ? [{ icon: "message-circle" as const, label: "WhatsApp", value: settings.phone, href: whatsapp, external: true }] : []),
    ...(settings.linkedin_url
      ? [{ icon: "linkedin" as const, label: "LinkedIn", value: "Connect on LinkedIn", href: settings.linkedin_url, external: true }]
      : []),
    ...(settings.github_url
      ? [{ icon: "github" as const, label: "GitHub", value: settings.github_url.replace(/^https?:\/\//, ""), href: settings.github_url, external: true }]
      : []),
  ];

  return (
    <>
      <header className={`wrap ${shared.header}`}>
        <h1 className={shared.title}>{blocks.header.label}</h1>
        {blocks.header.intro ? <p className={shared.lead}>{blocks.header.intro}</p> : null}
      </header>

      <section className={`wrap ${shared.section} ${styles.grid}`} aria-label="Contact options">
        <div className={styles.book}>
          <h2 className="label">{blocks.header.enquiry_tab}</h2>
          <p className={styles.bookText}>Pick a time for a free 30-minute discovery call.</p>
          {calUrl ? (
            <ButtonAnchor href={calUrl} target="_blank" rel="noopener" icon="calendar">
              Book a discovery call
            </ButtonAnchor>
          ) : null}
          <p className={styles.note}>{blocks.header.response_note}</p>
        </div>

        <ul className={styles.methods}>
          {methods.map((m) => (
            <li key={m.label}>
              <a
                href={m.href}
                className={styles.method}
                {...(m.external ? { target: "_blank", rel: "noopener" } : {})}
              >
                <span className="label">{m.label}</span>
                <span className={styles.value}>
                  <Icon name={m.icon} size={18} />
                  {m.value}
                </span>
                <Icon name="arrow-up-right" size={20} className={styles.arrow} />
              </a>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
