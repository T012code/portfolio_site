"use client";

import { ArrowUpRightIcon, ListIcon, XIcon } from "@phosphor-icons/react";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { Mark } from "@/components/brand/Mark";
import { Wordmark } from "@/components/brand/Wordmark";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { ButtonLink } from "@/components/ui/Button";
import styles from "./SiteHeader.module.css";

const LINKS = [
  { href: "/work", label: "Work" },
  { href: "/about", label: "About" },
  { href: "/resume", label: "Resume" },
  { href: "/contact", label: "Contact" },
] as const;

const SPRING = { type: "spring", stiffness: 420, damping: 34, mass: 0.7 } as const;

export function SiteHeader({ name }: { name: string }) {
  const pathname = usePathname();
  const reduce = useReducedMotion();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
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
  const current = LINKS.find((l) => isActive(l.href))?.href ?? null;
  const highlight = hovered ?? current;

  return (
    <header
      className={styles.header}
      data-scrolled={scrolled || undefined}
      data-open={open || undefined}
      style={{ viewTransitionName: "site-header" }}
    >
      <div className={`wrap ${styles.outer}`}>
        <div className={styles.bar}>
          <Link href="/" className={styles.brand} aria-label={`${name}, home`}>
            <Mark className={styles.mark} />
            <Wordmark className={styles.wordmark} />
          </Link>

          <nav className={styles.nav} aria-label="Main">
            <LayoutGroup id="main-nav">
              <ul onPointerLeave={() => setHovered(null)}>
                {LINKS.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className={styles.link}
                      aria-current={isActive(link.href) ? "page" : undefined}
                      onPointerEnter={() => setHovered(link.href)}
                      onFocus={() => setHovered(link.href)}
                      onBlur={() => setHovered(null)}
                    >
                      {highlight === link.href ? (
                        <motion.span
                          layoutId="nav-pill"
                          className={styles.pill}
                          data-current={link.href === current || undefined}
                          transition={reduce ? { duration: 0 } : SPRING}
                        />
                      ) : null}
                      <span className={styles.linkText}>{link.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </LayoutGroup>
          </nav>

          <div className={styles.actions}>
            <ThemeToggle hint={pathname === "/"} />
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
              <AnimatePresence initial={false} mode="popLayout">
                <motion.span
                  key={open ? "x" : "menu"}
                  className={styles.menuIcon}
                  initial={reduce ? { opacity: 0 } : { opacity: 0, rotate: -90, scale: 0.6 }}
                  animate={{ opacity: 1, rotate: 0, scale: 1 }}
                  exit={reduce ? { opacity: 0 } : { opacity: 0, rotate: 90, scale: 0.6 }}
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                >
                  {open ? <XIcon size={22} weight="bold" /> : <ListIcon size={22} weight="bold" />}
                </motion.span>
              </AnimatePresence>
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {open ? (
          <motion.div
            id={menuId}
            className={styles.sheet}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          >
            <nav aria-label="Mobile">
              <ul className={styles.sheetList}>
                {[{ href: "/", label: "Home" }, ...LINKS].map((link, i) => (
                  <motion.li
                    key={link.href}
                    initial={reduce ? false : { opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 + i * 0.045, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <Link
                      href={link.href}
                      className={styles.sheetLink}
                      aria-current={pathname === link.href ? "page" : undefined}
                      onClick={() => setOpen(false)}
                    >
                      {link.label}
                      <ArrowUpRightIcon size={26} weight="bold" aria-hidden="true" />
                    </Link>
                  </motion.li>
                ))}
              </ul>
              <ButtonLink href="/contact" block icon="arrow-up-right" onClick={() => setOpen(false)}>
                Book a discovery call
              </ButtonLink>
            </nav>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
