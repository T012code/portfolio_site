import Link from "next/link";
import { Mark } from "@/components/brand/Mark";
import { Icon } from "@/components/ui/Icon";
import type { Settings } from "@/lib/content";
import styles from "./SiteFooter.module.css";

export function SiteFooter({ settings, year }: { settings: Settings; year: number }) {
  return (
    <footer className={styles.footer}>
      <div className={`wrap ${styles.inner}`}>
        <div className={styles.top}>
          <Link href="/" className={styles.mark} aria-label={`${settings.display_name}, home`}>
            <Mark />
          </Link>
          <p className={styles.taglines}>
            {settings.taglines.map((t) => (
              <span key={t}>{t}</span>
            ))}
          </p>
        </div>

        <div className={styles.bottom}>
          <p className={styles.meta}>
            {settings.display_name} · {year} · {settings.location}
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
              <a href="#top" className={styles.top_link}>
                Back to top <Icon name="arrow-up" size={14} />
              </a>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
