"use client";

import { useState, useTransition } from "react";
import { updateInboxItem } from "../../actions";
import styles from "../../admin.module.css";

export type InboxEntry = {
  id: string;
  created_at: string;
  name: string;
  email: string;
  whatsapp: string;
  message: string;
  status: string;
  admin_notes: string;
  company?: string;
  service?: string;
  budget?: string;
  timeline?: string;
  booking_start?: string | null;
};

const STATUSES = {
  enquiries: ["new", "booked", "replied", "archived"],
  messages: ["new", "replied", "archived"],
} as const;

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Africa/Lagos",
});

export function InboxItem({ kind, entry }: { kind: "enquiries" | "messages"; entry: InboxEntry }) {
  const [status, setStatus] = useState(entry.status);
  const [notes, setNotes] = useState(entry.admin_notes);
  const [error, setError] = useState<string | null>(null);
  const [savedNotes, setSavedNotes] = useState(false);
  const [pending, startTransition] = useTransition();

  const wa = entry.whatsapp.replace(/\D/g, "");
  const subject = encodeURIComponent(
    kind === "enquiries" ? `Re: your ${entry.service || "project"} enquiry` : "Re: your message",
  );

  function save(patch: { status?: string; admin_notes?: string }, rollback?: () => void) {
    setError(null);
    startTransition(async () => {
      try {
        await updateInboxItem(kind, entry.id, patch);
        if (patch.admin_notes !== undefined) setSavedNotes(true);
      } catch (e) {
        rollback?.();
        setError((e as Error).message);
      }
    });
  }

  const details: [string, string | undefined | null][] = [
    ["Received", dateFormat.format(new Date(entry.created_at))],
    ["Service", entry.service],
    ["Budget", entry.budget],
    ["Timeline", entry.timeline],
    ["Company", entry.company],
    ["Call", entry.booking_start ? dateFormat.format(new Date(entry.booking_start)) : null],
  ];

  return (
    <li className={styles.inboxItem}>
      <div className={styles.inboxHead}>
        <div>
          <strong>{entry.name}</strong>{" "}
          <a href={`mailto:${entry.email}?subject=${subject}`} className={styles.muted}>
            {entry.email}
          </a>
        </div>
        <span className={styles.status} data-status={status}>
          {status}
        </span>
      </div>

      <dl className={styles.meta}>
        {details
          .filter(([, v]) => v)
          .map(([k, v]) => (
            <div key={k} className={styles.metaPair}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
      </dl>

      <p className={styles.message}>{entry.message}</p>

      <div className={styles.mediaButtons}>
        <a href={`mailto:${entry.email}?subject=${subject}`} className={styles.smallButton}>
          Reply by email
        </a>
        {wa ? (
          <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener" className={styles.smallButton}>
            WhatsApp
          </a>
        ) : null}
        <label className={styles.metaPair} style={{ alignItems: "center" }}>
          <span className="visually-hidden">Status</span>
          <select
            className={styles.input}
            style={{ minHeight: "2.25rem", width: "auto" }}
            value={status}
            disabled={pending}
            onChange={(e) => {
              const previous = status;
              setStatus(e.target.value);
              save({ status: e.target.value }, () => setStatus(previous));
            }}
          >
            {STATUSES[kind].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
      </div>

      <details>
        <summary className={styles.muted} style={{ cursor: "pointer" }}>
          Private notes{entry.admin_notes ? " ·" : ""}
        </summary>
        <div className={styles.stack} style={{ gap: "var(--space-2)", marginTop: "var(--space-2)" }}>
          <textarea
            className={styles.input}
            aria-label="Private notes"
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
              setSavedNotes(false);
            }}
            rows={3}
          />
          <div className={styles.mediaButtons}>
            <button type="button" className={styles.smallButton} onClick={() => save({ admin_notes: notes })} disabled={pending}>
              Save notes
            </button>
            {savedNotes ? <span className={styles.muted}>Saved</span> : null}
          </div>
        </div>
      </details>

      {error ? (
        <p className={styles.alertError} role="alert">
          {error}
        </p>
      ) : null}
    </li>
  );
}
