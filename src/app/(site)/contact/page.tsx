import type { Metadata } from "next";
import { PageTransition } from "@/components/motion/PageTransition";
import { Icon, type IconName } from "@/components/ui/Icon";
import { getBlocks, getSettings } from "@/lib/content";
import { whatsappUrl } from "@/lib/format";
import { ContactForms } from "./ContactForms";
import shared from "../page.module.css";
import styles from "./contact.module.css";

export async function generateMetadata(): Promise<Metadata> {
  const blocks = await getBlocks("contact");
  return { title: blocks.header.label, description: blocks.header.intro || undefined, alternates: { canonical: "/contact" } };
}

export default async function ContactPage() {
  const [settings, blocks] = await Promise.all([getSettings(), getBlocks("contact")]);
  const whatsapp = whatsappUrl(settings.whatsapp);

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
    <PageTransition>
      <header className={`wrap ${shared.header}`}>
        <h1 className={shared.title}>
          <span className="intro-line">
            <span>{blocks.header.label}</span>
          </span>
        </h1>
        {blocks.header.intro ? <p className={`intro-fade ${shared.lead}`}>{blocks.header.intro}</p> : null}
      </header>

      <section className={`wrap ${shared.section} ${styles.grid}`} aria-label="Contact options">
        <ContactForms
          labels={{
            enquiry: blocks.header.enquiry_tab,
            message: blocks.header.message_tab,
            responseNote: blocks.header.response_note,
          }}
          options={{
            services: settings.service_options,
            timelines: settings.timeline_options,
          }}
          calLink={settings.cal_link}
          email={settings.email}
          recaptchaKey={settings.recaptcha_enabled && settings.recaptcha_site_key ? settings.recaptcha_site_key : null}
        />

        <aside aria-label="Other ways to reach me">
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
        </aside>
      </section>
    </PageTransition>
  );
}
