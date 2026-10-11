"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon, type IconName } from "@/components/ui/Icon";
import styles from "../admin.module.css";

type Item = { href: string; label: string; icon: IconName; badge?: number };

export function AdminNav({ groups }: { groups: { heading: string; items: Item[] }[] }) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/admin" ? pathname === href : pathname.startsWith(href));

  return (
    <nav aria-label="Admin" className={styles.nav}>
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
                  <Icon name={item.icon} size={16} className={styles.navIcon} />
                  <span className={styles.navText}>{item.label}</span>
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

/** Sidebar on wide screens; a top bar with a slide-in menu on phones. */
export function SidebarFrame({ brand, children }: { brand: React.ReactNode; children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [lastPath, setLastPath] = useState(pathname);

  // Close the menu after navigating.
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <div className={styles.topbar}>
        {brand}
        <button
          type="button"
          className={styles.iconButton}
          aria-expanded={open}
          aria-controls="admin-sidebar"
          onClick={() => setOpen((v) => !v)}
        >
          <Icon name={open ? "x" : "menu"} size={18} />
          <span className="visually-hidden">{open ? "Close menu" : "Open menu"}</span>
        </button>
      </div>
      {open ? <div className={styles.scrim} onClick={() => setOpen(false)} aria-hidden="true" /> : null}
      <aside id="admin-sidebar" className={styles.sidebar} data-open={open || undefined}>
        <div className={styles.sidebarBrand}>{brand}</div>
        {children}
      </aside>
    </>
  );
}
