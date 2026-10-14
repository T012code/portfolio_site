import { ArrowUpIcon, EnvelopeSimpleIcon, GithubLogoIcon, LinkedinLogoIcon, WhatsappLogoIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { Mark } from "@/components/brand/Mark";
import { CookieSettingsButton } from "@/components/site/CookieSettingsButton";
import type { Settings } from "@/lib/content";
import { whatsappUrl } from "@/lib/format";
import styles from "./SiteFooter.module.css";

const PAGES = [
  { href: "/work", label: "Work" },
  { href: "/about", label: "About" },
  { href: "/resume", label: "Resume" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
];

const LEGAL = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
];

export function SiteFooter({ settings, year }: { settings: Settings; year: number }) {
  const whatsapp = whatsappUrl(settings.whatsapp);
  const socials = [
    { href: `mailto:${settings.email}`, label: "Email", icon: EnvelopeSimpleIcon },
    settings.github_url ? { href: settings.github_url, label: "GitHub", icon: GithubLogoIcon, external: true } : null,
    settings.linkedin_url ? { href: settings.linkedin_url, label: "LinkedIn", icon: LinkedinLogoIcon, external: true } : null,
    whatsapp ? { href: whatsapp, label: "WhatsApp", icon: WhatsappLogoIcon, external: true } : null,
  ].filter((s) => s !== null);

  return (
    <footer className={styles.footer} style={{ viewTransitionName: "site-footer" }}>
      <div className={`wrap ${styles.inner}`}>
        <div className={styles.top}>
          <div className={styles.brand}>
            <Link href="/" className={styles.mark} aria-label={`${settings.display_name}, home`}>
              <Mark />
            </Link>
            <p className={styles.motto}>{settings.motto}</p>
          </div>
          <nav aria-label="Footer">
            <ul className={styles.links}>
              {PAGES.map((p) => (
                <li key={p.href}>
                  <Link href={p.href}>{p.label}</Link>
                </li>
              ))}
            </ul>
          </nav>
          <ul className={styles.socials}>
            {socials.map(({ href, label, icon: Glyph, external }) => (
              <li key={label}>
                <a
                  href={href}
                  className={styles.social}
                  aria-label={label}
                  title={label}
                  {...(external ? { target: "_blank", rel: "me noopener" } : {})}
                >
                  <Glyph size={20} weight="duotone" aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className={styles.bottom}>
          <p className={styles.meta}>
            © {year} {settings.display_name} · {settings.location}
            {LEGAL.map((l) => (
              <span key={l.href}>
                {" · "}
                <Link href={l.href} className={styles.metaLink}>
                  {l.label}
                </Link>
              </span>
            ))}
            {" · "}
            <CookieSettingsButton className={`${styles.metaLink} ${styles.metaButton}`} />
          </p>
          <a href="#top" className={styles.topLink}>
            Back to top
            <span className={styles.topIcon}>
              <ArrowUpIcon size={14} weight="bold" aria-hidden="true" />
            </span>
          </a>
        </div>
      </div>
    </footer>
  );
}
