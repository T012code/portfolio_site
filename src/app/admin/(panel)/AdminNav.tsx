"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "../admin.module.css";

type Item = { href: string; label: string; badge?: number };

export function AdminNav({ groups }: { groups: { heading: string; items: Item[] }[] }) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/admin" ? pathname === href : pathname.startsWith(href));

  return (
    <nav aria-label="Admin" className={styles.stack}>
      {groups.map((group) => (
        <div key={group.heading}>
          <p className={`label ${styles.navHeading}`}>{group.heading}</p>
          <ul className={styles.navGroup}>
            {group.items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={styles.navLink}
                  aria-current={isActive(item.href) ? "page" : undefined}
                >
                  {item.label}
                  {item.badge ? (
                    <span className={styles.badge} aria-label={`${item.badge} new`}>
                      {item.badge}
                    </span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}
