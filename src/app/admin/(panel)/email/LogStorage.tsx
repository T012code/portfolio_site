"use client";

import { startTransition, useActionState, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import type { FormState } from "../../actions";
import { clearLog, clearLogContent, saveLogStorage } from "../../log-actions";
import styles from "../../admin.module.css";

const RETENTION = [
  { days: 7, label: "1 week" },
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
  { days: 180, label: "6 months" },
  { days: 365, label: "1 year" },
  { days: 0, label: "Forever" },
];

export type LogStats = { entries: number; with_content: number; content_bytes: number; table_bytes: number; oldest: string | null };

const dayFormat = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "Africa/Lagos" });

function size(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function LogStorage({ retention, storeContent, stats }: { retention: number; storeContent: boolean; stats: LogStats | null }) {
  const [state, formAction, saving] = useActionState<FormState, FormData>(saveLogStorage, { status: "idle" });
  const [notice, setNotice] = useState<{ ok: boolean; message: string } | null>(null);
  const [clearing, startClear] = useTransition();

  const run = (question: string, fn: () => Promise<{ ok: boolean; message: string }>) => {
    if (!window.confirm(question)) return;
    setNotice(null);
    startClear(async () => setNotice(await fn()));
  };

  return (
    <section className={styles.card} aria-labelledby="log-storage-heading">
      <div className={styles.cardHead}>
        <h2 id="log-storage-heading" className={styles.cardTitle}>
          Storage
        </h2>
        <span className={styles.muted}>How long the log keeps entries, and whether it keeps a copy of each email.</span>
      </div>

      {stats ? (
        <dl className={styles.meta}>
          <div>
            <dt>Entries</dt>
            <dd>{stats.entries.toLocaleString("en-GB")}</dd>
          </div>
          <div>
            <dt>With a stored copy</dt>
            <dd>{stats.with_content.toLocaleString("en-GB")}</dd>
          </div>
          <div>
            <dt>Email content</dt>
            <dd>{size(stats.content_bytes)}</dd>
          </div>
          <div>
            <dt>Log on disk</dt>
            <dd>{size(stats.table_bytes)}</dd>
          </div>
          <div>
            <dt>Oldest entry</dt>
            <dd>{stats.oldest ? dayFormat.format(new Date(stats.oldest)) : "None"}</dd>
          </div>
        </dl>
      ) : null}

      <form
        className={styles.form}
        style={{ maxWidth: "none" }}
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          startTransition(() => formAction(data));
        }}
      >
        {state.status !== "idle" && state.message ? (
          <p role={state.status === "error" ? "alert" : "status"} className={state.status === "error" ? styles.alertError : styles.alertSuccess}>
            {state.message}
          </p>
        ) : null}
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Keep entries for</span>
          <select name="log_retention_days" className={styles.input} defaultValue={String(retention)} style={{ maxWidth: "16rem" }}>
            {RETENTION.map((r) => (
              <option key={r.days} value={r.days}>
                {r.label}
              </option>
            ))}
          </select>
          <span className={styles.hint}>Older entries are removed automatically whenever you open this page.</span>
        </label>
        <label className={styles.switch}>
          <input type="checkbox" name="log_store_content" defaultChecked={storeContent} role="switch" />
          <span>
            Keep a copy of each email
            <span className={styles.switchHint}>
              Needed to preview and resend. Copies contain what visitors wrote, so they follow the same retention period.
            </span>
          </span>
        </label>
        <div className={styles.formActions}>
          <Button type="submit" loading={saving} icon="check">
            {saving ? "Saving…" : "Save storage settings"}
          </Button>
        </div>
      </form>

      <div className={styles.stack} style={{ gap: "var(--space-3)" }}>
        <h3 className="label">Clean up now</h3>
        {notice ? (
          <p role={notice.ok ? "status" : "alert"} className={notice.ok ? styles.alertSuccess : styles.alertError}>
            {notice.message}
          </p>
        ) : null}
        <div className={styles.inline}>
          <button
            type="button"
            className={styles.smallButton}
            disabled={clearing}
            onClick={() => run("Remove the stored copy of every email? The log entries stay.", clearLogContent)}
          >
            Remove stored copies
          </button>
          <button
            type="button"
            className={`${styles.smallButton} ${styles.dangerButton}`}
            disabled={clearing}
            onClick={() => run("Delete every entry in the email log? This can't be undone.", clearLog)}
          >
            Delete the whole log
          </button>
        </div>
      </div>
    </section>
  );
}
