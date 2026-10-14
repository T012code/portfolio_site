"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type RefObject } from "react";
import { whenPreloaded } from "@/components/preloader/events";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { onOpenConsent, saveConsent, useConsent, type Consent } from "@/lib/consent";
import styles from "./ConsentPanel.module.css";

const PRIVACY_PATH = "/privacy";
/** Matches the phone layout in ConsentPanel.module.css. */
const PHONE_QUERY = "(max-width: 560px)";

type CardProps = {
  consent: Consent | null | undefined;
  titleRef: RefObject<HTMLHeadingElement | null>;
  onChoose: (analytics: boolean) => void;
  onClose?: () => void;
  inline?: boolean;
};

// The card itself: the ID badge's punched slot and laminate, a title, one sentence and the two
// choices. The privacy policy, linked from the sentence, has the details.
function Card({ consent, titleRef, onChoose, onClose, inline }: CardProps) {
  return (
    <>
      {onClose ? (
        <button type="button" className={styles.close} onClick={onClose} aria-label="Close cookie settings">
          <Icon name="x" size={16} />
        </button>
      ) : null}

      <div className={styles.text} data-close={onClose ? "" : undefined}>
        <h2 ref={titleRef} tabIndex={-1} className={styles.title}>
          Can I count your visit?
        </h2>
        <p className={styles.body}>
          Only to see which pages get read. No ads, nothing sold.{" "}
          {inline ? (
            "Change it any time here or in the footer."
          ) : (
            <>
              Change it any time in the footer, or read the{" "}
              <Link href={PRIVACY_PATH} className={styles.link}>
                privacy policy
              </Link>
              .
            </>
          )}
        </p>
      </div>

      {consent ? (
        <p className={styles.status} role={inline ? "status" : undefined}>
          Visit counting is {consent.analytics ? "on" : "off"}.
        </p>
      ) : null}

      <div className={styles.actions}>
        <Button type="button" icon={null} block className={styles.choice} onClick={() => onChoose(false)}>
          Reject
        </Button>
        <Button type="button" icon={null} block className={styles.choice} onClick={() => onChoose(true)}>
          Accept
        </Button>
      </div>
    </>
  );
}

/**
 * The cookie notice: says what is used and how to withdraw, and offers an explicit accept or reject
 * (Nigeria's GAID 2025, Art. 19); the privacy policy it links to covers the rest. It sits at the
 * bottom left (along the bottom on phones, where it waits until the visitor scrolls) until the
 * visitor chooses, and reopens from "Cookie settings" in the footer. GAID Art. 7(l) treats a bottom notice "where it may be ignored or be
 * unnoticed" as a lack of transparency, so this one is fixed in view, animates in and can't be
 * dismissed without a choice the first time; no choice is ever assumed. On the privacy page the
 * same card sits in the page instead (ConsentSettings).
 */
export function ConsentPanel() {
  const consent = useConsent();
  const pathname = usePathname();
  const reduce = useReducedMotion();
  const [ready, setReady] = useState(false);
  const [reopened, setReopened] = useState(false);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);

  // First visit: wait for the intro to finish so the notice isn't hidden behind it. On phones it
  // waits longer, until 2 seconds after the visitor starts scrolling, so the first screen stays
  // clear; a page too short to scroll shows it 2 seconds after the intro instead.
  useEffect(() => {
    let timer: number | undefined;
    let onScroll: (() => void) | undefined;
    const showIn = (ms: number) => {
      timer = window.setTimeout(() => setReady(true), ms);
    };
    const stop = whenPreloaded(() => {
      const phone = window.matchMedia(PHONE_QUERY).matches;
      const scrollable = document.documentElement.scrollHeight > window.innerHeight;
      if (!phone) return showIn(400);
      if (!scrollable) return showIn(2000);
      onScroll = () => showIn(2000);
      window.addEventListener("scroll", onScroll, { once: true, passive: true });
    });
    return () => {
      stop();
      window.clearTimeout(timer);
      if (onScroll) window.removeEventListener("scroll", onScroll);
    };
  }, []);

  useEffect(
    () =>
      onOpenConsent(() => {
        if (window.location.pathname === PRIVACY_PATH) return;
        returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        setReady(true);
        setReopened(true);
      }),
    [],
  );

  const show = pathname !== PRIVACY_PATH && consent !== undefined && ready && (consent === null || reopened);

  // Reopened on purpose: move focus in, so keyboard and screen reader users land on it.
  useEffect(() => {
    if (show && reopened) titleRef.current?.focus();
  }, [show, reopened]);

  function close() {
    setReopened(false);
    returnFocus.current?.focus();
    returnFocus.current = null;
  }

  const motionProps = reduce
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.15 } }
    : {
        initial: { opacity: 0, y: 32, rotate: -2 },
        animate: { opacity: 1, y: 0, rotate: 0 },
        exit: { opacity: 0, y: 32, rotate: -2 },
        transition: { type: "spring" as const, stiffness: 260, damping: 26 },
      };

  return (
    <div className={styles.dock}>
      <AnimatePresence>
        {show ? (
          <motion.section
            key="consent"
            className={styles.card}
            aria-label="Cookie notice"
            onKeyDown={(e) => {
              if (e.key === "Escape" && consent) close();
            }}
            {...motionProps}
          >
            <Card
              consent={consent}
              titleRef={titleRef}
              onChoose={(analytics) => {
                saveConsent(analytics);
                close();
              }}
              onClose={consent ? close : undefined}
            />
          </motion.section>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/** The same card in the flow of the privacy page, where it doubles as the page's cookie settings. */
export function ConsentSettings() {
  const consent = useConsent();
  const ref = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(
    () =>
      onOpenConsent(() => {
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        ref.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
        titleRef.current?.focus({ preventScroll: true });
      }),
    [],
  );

  return (
    <section ref={ref} id="cookies" className={`${styles.card} ${styles.inline}`} aria-label="Cookie notice">
      <Card consent={consent} titleRef={titleRef} onChoose={saveConsent} inline />
    </section>
  );
}
