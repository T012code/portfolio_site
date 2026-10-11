"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { Wordmark } from "@/components/brand/Wordmark";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import styles from "./SiteHeader.module.css";

const LINKS = [
  { href: "/work", label: "Work" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
] as const;

export function SiteHeader({ name }: { name: string }) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [openedAt, setOpenedAt] = useState(pathname);
  const menuId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);

  // Close the menu when the route changes (state adjusted during render, not in an effect).
  if (openedAt !== pathname) {
    setOpenedAt(pathname);
    setOpen(false);
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    document.documentElement.dataset.menuOpen = "";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      delete document.documentElement.dataset.menuOpen;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className={styles.header} data-scrolled={scrolled || undefined} data-open={open || undefined}>
      <div className={`wrap ${styles.bar}`}>
        <Link href="/" className={styles.brand} aria-label={`${name}, home`}>
          <Wordmark className={styles.wordmark} />
        </Link>

        <nav className={styles.nav} aria-label="Main">
          <ul>
            {LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={styles.link}
                  aria-current={isActive(link.href) ? "page" : undefined}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className={styles.actions}>
          <ThemeToggle />
          <ButtonLink href="/contact" className={styles.cta} icon="arrow-up-right">
            Book a call
          </ButtonLink>
          <button
            ref={toggleRef}
            type="button"
            className={styles.menuButton}
            aria-expanded={open}
            aria-controls={menuId}
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
          >
            <Icon name={open ? "x" : "menu"} size={22} />
          </button>
        </div>
      </div>

      <div id={menuId} className={styles.sheet} hidden={!open}>
        <nav className="wrap" aria-label="Mobile">
          <ul className={styles.sheetList}>
            {[{ href: "/", label: "Home" }, ...LINKS].map((link, i) => (
              <li key={link.href} style={{ "--i": i } as React.CSSProperties}>
                <Link
                  href={link.href}
                  className={styles.sheetLink}
                  aria-current={pathname === link.href ? "page" : undefined}
                  onClick={() => setOpen(false)}
                >
                  {link.label}
                  <Icon name="arrow-right" size={28} />
                </Link>
              </li>
            ))}
          </ul>
          <ButtonLink href="/contact" block icon="arrow-up-right" onClick={() => setOpen(false)}>
            Book a discovery call
          </ButtonLink>
        </nav>
      </div>
    </header>
  );
}
