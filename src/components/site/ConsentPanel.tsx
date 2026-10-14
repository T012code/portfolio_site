"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type RefObject } from "react";
import { Mark } from "@/components/brand/Mark";
import { whenPreloaded } from "@/components/preloader/events";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { onOpenConsent, saveConsent, useConsent, type Consent } from "@/lib/consent";
import styles from "./ConsentPanel.module.css";

const PRIVACY_PATH = "/privacy";

type CardProps = {
  consent: Consent | null | undefined;
  titleRef: RefObject<HTMLHeadingElement | null>;
  onChoose: (analytics: boolean) => void;
  onClose?: () => void;
  inline?: boolean;
};

// The card itself, laid out like the ID badge: mark and a mono label at the top, a dashed rule above
// the foot. Kept to one line of text; the privacy policy has the details.
function Card({ consent, titleRef, onChoose, onClose, inline }: CardProps) {
  return (
    <>
      <div className={styles.head}>
        <Mark className={styles.mark} />
        <span className={styles.kind}>Cookie notice</span>
        {onClose ? (
          <button type="button" className={styles.close} onClick={onClose} aria-label="Close cookie settings">
            <Icon name="x" size={16} />
          </button>
        ) : null}
      </div>

      <div className={styles.text}>
        <h2 ref={titleRef} tabIndex={-1} className={styles.title}>
          Can I count your visit?
        </h2>
        <p className={styles.body}>Only to see which pages get read. No ads, nothing sold.</p>
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

      <div className={styles.foot}>
        <span>Change it in the footer.</span>
        {inline ? null : (
          <Link href={PRIVACY_PATH} className={styles.policy}>
            Privacy policy
          </Link>
        )}
      </div>
    </>
  );
}

/**
 * The cookie notice. Nigeria's GAID 2025 asks for a notice that covers the middle, left or right of
 * the page (Art. 7(l)), says what is used and how to withdraw, and offers an explicit accept or
 * reject (Art. 19); the privacy policy it links to covers the rest. It floats on the left,
 * vertically centred, until the visitor chooses, and reopens from "Cookie settings" in the footer.
 * It can't be dismissed without a choice the first time, so no choice is ever assumed. On the
 * privacy page the same card sits in the page instead (ConsentSettings).
 */
export function ConsentPanel() {
  const consent = useConsent();
  const pathname = usePathname();
  const reduce = useReducedMotion();
  const [ready, setReady] = useState(false);
  const [reopened, setReopened] = useState(false);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);

  // First visit: wait for the intro to finish so the notice isn't hidden behind it.
  useEffect(() => {
    let timer: number | undefined;
    const stop = whenPreloaded(() => {
      timer = window.setTimeout(() => setReady(true), 400);
    });
    return () => {
      stop();
      window.clearTimeout(timer);
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
        initial: { opacity: 0, x: -48, rotate: -2 },
        animate: { opacity: 1, x: 0, rotate: 0 },
        exit: { opacity: 0, x: -48, rotate: -2 },
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
