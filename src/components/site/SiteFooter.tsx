import Link from "next/link";
import { Mark } from "@/components/brand/Mark";
import { Icon } from "@/components/ui/Icon";
import type { Settings } from "@/lib/content";
import styles from "./SiteFooter.module.css";

const PAGES = [
  { href: "/work", label: "Work" },
  { href: "/about", label: "About" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
];

const LEGAL = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
];

export function SiteFooter({ settings, year }: { settings: Settings; year: number }) {
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
          </p>
          <ul className={styles.links}>
            <li>
              <a href={`mailto:${settings.email}`}>{settings.email}</a>
            </li>
            {settings.github_url ? (
              <li>
                <a href={settings.github_url} rel="me noopener" target="_blank">
                  GitHub
                </a>
              </li>
            ) : null}
            {settings.linkedin_url ? (
              <li>
                <a href={settings.linkedin_url} rel="me noopener" target="_blank">
                  LinkedIn
                </a>
              </li>
            ) : null}
            <li>
              <a href="#top" className={styles.topLink}>
                Back to top <Icon name="arrow-up" size={14} />
              </a>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
