import { PaperPlaneTiltIcon } from "@phosphor-icons/react/ssr";
import type { ReactNode } from "react";
import button from "./Button.module.css";
import styles from "./SubmitButton.module.css";

type Props = {
  pending: boolean;
  children: ReactNode;
  pendingLabel?: string;
};

// The form's send button. While sending, the label rolls up to "Sending", the paper plane
// takes off and a ring spins in its place, and a sheen sweeps the pill until the reply lands.
// Both labels share one grid cell, so the button never changes width mid-flight.
export function SubmitButton({ pending, children, pendingLabel = "Sending" }: Props) {
  return (
    <button
      type="submit"
      className={`${button.button} ${button.primary} ${styles.submit}`}
      disabled={pending}
      aria-busy={pending || undefined}
      data-loading={pending || undefined}
    >
      <span className={styles.labels}>
        <span aria-hidden={pending || undefined}>{children}</span>
        <span aria-hidden={!pending || undefined}>{pendingLabel}</span>
      </span>
      <span className={`${button.icon} ${styles.chip}`}>
        <PaperPlaneTiltIcon className={styles.plane} size={16} weight="fill" aria-hidden="true" />
        <svg className={styles.ring} viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="8" pathLength={1} />
        </svg>
      </span>
    </button>
  );
}

/** A check that draws itself inside a ring that pops: the "sent" moment after a form submits. */
export function SentMark() {
  return (
    <span className={styles.sent} aria-hidden="true">
      <svg viewBox="0 0 48 48">
        <circle className={styles.sentRing} cx="24" cy="24" r="21" pathLength={1} />
        <path className={styles.sentCheck} d="M15 24.5 21.5 31 33.5 18" pathLength={1} />
      </svg>
    </span>
  );
}
