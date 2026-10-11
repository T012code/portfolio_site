"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { deleteLogEntries, getLogEntry, resendLogEntry, type LogEntry } from "../../log-actions";
import styles from "../../admin.module.css";

export type LogRow = {
  id: string;
  created_at: string;
  kind: string;
  to_email: string;
  subject: string;
  status: string;
  detail: string;
  ref_type: string | null;
  ref_id: string | null;
  resent_from: string | null;
};

const KIND_LABELS: Record<string, string> = {
  notification: "Notification",
  autoreply: "Autoreply",
  reply: "Reply",
  test: "Test",
};

const dateFormat = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Lagos" });
const tone = (s: string) => (s === "sent" ? "ok" : s === "failed" ? "error" : s === "skipped" ? "warn" : "neutral");

type Notice = { ok: boolean; message: string } | null;

export function MailLogTable({ rows }: { rows: LogRow[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [notice, setNotice] = useState<Notice>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  // Rows change after a delete or resend: drop selections that no longer exist.
  const visible = new Set(rows.map((r) => r.id));
  const chosen = [...selected].filter((id) => visible.has(id));
  const allChosen = rows.length > 0 && chosen.length === rows.length;

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  function remove(ids: string[]) {
    const what = ids.length === 1 ? "this entry" : `${ids.length} entries`;
    if (!window.confirm(`Delete ${what} from the log? This can't be undone.`)) return;
    setBusyId(ids.length === 1 ? ids[0] : null);
    start(async () => {
      const result = await deleteLogEntries(ids);
      setNotice(result);
      setSelected(new Set());
      if (openId && ids.includes(openId)) setOpenId(null);
      setBusyId(null);
    });
  }

  function resend(row: { id: string; to_email: string }) {
    if (!window.confirm(`Send this email again to ${row.to_email}?`)) return;
    setBusyId(row.id);
    start(async () => {
      const result = await resendLogEntry(row.id);
      setNotice({
        ok: result.status === "sent",
        message: result.status === "sent" ? `Sent again to ${row.to_email}.` : result.detail,
      });
      setBusyId(null);
    });
  }

  return (
    <>
      {notice ? (
        <p role={notice.ok ? "status" : "alert"} className={notice.ok ? styles.alertSuccess : styles.alertError}>
          {notice.message}
        </p>
      ) : null}

      <div className={styles.inline} style={{ minHeight: "2.25rem" }}>
        {chosen.length > 0 ? (
          <>
            <span className={styles.muted}>{chosen.length} selected</span>
            <button
              type="button"
              className={`${styles.smallButton} ${styles.dangerButton}`}
              disabled={pending}
              onClick={() => remove(chosen)}
            >
              Delete selected
            </button>
            <button type="button" className={styles.linkButton} onClick={() => setSelected(new Set())}>
              Clear selection
            </button>
          </>
        ) : (
          <span className={styles.muted}>Select entries to delete several at once.</span>
        )}
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col" style={{ width: "2.5rem" }}>
                <input
                  type="checkbox"
                  aria-label="Select all on this page"
                  checked={allChosen}
                  onChange={() => setSelected(allChosen ? new Set() : new Set(rows.map((r) => r.id)))}
                />
              </th>
              <th scope="col">When</th>
              <th scope="col">Type</th>
              <th scope="col">To</th>
              <th scope="col">Subject</th>
              <th scope="col">Result</th>
              <th scope="col">
                <span className="visually-hidden">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} data-selected={selected.has(row.id) || undefined}>
                <td>
                  <input
                    type="checkbox"
                    aria-label={`Select email to ${row.to_email}, ${row.subject}`}
                    checked={selected.has(row.id)}
                    onChange={() => toggle(row.id)}
                  />
                </td>
                <td className={styles.nowrap}>{dateFormat.format(new Date(row.created_at))}</td>
                <td className={styles.nowrap}>
                  {KIND_LABELS[row.kind] ?? row.kind}
                  {row.resent_from ? <span className={styles.muted}> · resent</span> : null}
                  {row.ref_id ? (
                    <>
                      {" "}
                      <Link
                        href={`/admin/inbox?tab=${row.ref_type === "message" ? "messages" : "enquiries"}&q=${encodeURIComponent(row.to_email)}`}
                        className={styles.muted}
                      >
                        (inbox)
                      </Link>
                    </>
                  ) : null}
                </td>
                <td className={styles.clip} title={row.to_email}>
                  {row.to_email}
                </td>
                <td className={styles.clip} title={row.subject}>
                  <button type="button" className={styles.linkButton} onClick={() => setOpenId(row.id)}>
                    {row.subject || "(no subject)"}
                  </button>
                </td>
                <td>
                  <span className={styles.tone} data-tone={tone(row.status)}>
                    {row.status}
                  </span>
                  {row.detail ? (
                    <p className={styles.muted} style={{ marginTop: "var(--space-1)", maxWidth: "36ch" }}>
                      {row.detail}
                    </p>
                  ) : null}
                </td>
                <td className={styles.nowrap}>
                  <div className={styles.rowActions}>
                    <button type="button" className={styles.smallButton} onClick={() => setOpenId(row.id)}>
                      View
                    </button>
                    <button
                      type="button"
                      className={styles.smallButton}
                      disabled={pending}
                      aria-busy={busyId === row.id || undefined}
                      onClick={() => resend(row)}
                    >
                      Resend
                    </button>
                    <button
                      type="button"
                      className={`${styles.smallButton} ${styles.dangerButton}`}
                      disabled={pending}
                      onClick={() => remove([row.id])}
                      aria-label={`Delete email to ${row.to_email}`}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <PreviewDialog
        id={openId}
        onClose={() => setOpenId(null)}
        onResend={(entry) => resend(entry)}
        onDelete={(id) => remove([id])}
        pending={pending}
      />
    </>
  );
}

function PreviewDialog({
  id,
  onClose,
  onResend,
  onDelete,
  pending,
}: {
  id: string | null;
  onClose: () => void;
  onResend: (entry: LogEntry) => void;
  onDelete: (id: string) => void;
  pending: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [state, setState] = useState<{ id: string; entry?: LogEntry; error?: string } | null>(null);
  const [view, setView] = useState<"html" | "text">("html");

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (id && !dialog.open) dialog.showModal();
    if (!id && dialog.open) dialog.close();
  }, [id]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    getLogEntry(id).then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setState({ id, entry: result.entry });
        setView(result.entry.body_html ? "html" : "text");
      } else setState({ id, error: result.message });
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const current = state && state.id === id ? state : null;
  const entry = current?.entry;
  const hasContent = Boolean(entry?.body_html || entry?.body_text);

  return (
    <dialog ref={ref} className={styles.dialog} onClose={onClose} aria-labelledby="log-preview-title">
      <div className={styles.dialogHead}>
        <h2 id="log-preview-title" className={styles.cardTitle} style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>
          {entry?.subject || "Email"}
        </h2>
        <button type="button" className={styles.smallButton} onClick={onClose}>
          Close
        </button>
      </div>
      <div className={styles.dialogBody}>
        {!current ? <p className={styles.muted}>Loading…</p> : null}
        {current?.error ? <p className={styles.alertError}>{current.error}</p> : null}
        {entry ? (
          <div className={styles.stack}>
            <dl className={styles.meta}>
              <div>
                <dt>To</dt>
                <dd>{entry.to_email}</dd>
              </div>
              {entry.reply_to ? (
                <div>
                  <dt>Reply-to</dt>
                  <dd>{entry.reply_to}</dd>
                </div>
              ) : null}
              <div>
                <dt>When</dt>
                <dd>{dateFormat.format(new Date(entry.created_at))}</dd>
              </div>
              <div>
                <dt>Type</dt>
                <dd>
                  {KIND_LABELS[entry.kind] ?? entry.kind}
                  {entry.resent_from ? " (resent)" : ""}
                </dd>
              </div>
              <div>
                <dt>Result</dt>
                <dd>
                  <span className={styles.tone} data-tone={tone(entry.status)}>
                    {entry.status}
                  </span>
                </dd>
              </div>
            </dl>
            {entry.detail ? <p className={styles.muted}>{entry.detail}</p> : null}

            <div className={styles.inline}>
              {entry.body_html && entry.body_text ? (
                <div className={styles.mediaButtons} role="radiogroup" aria-label="Show as">
                  {(["html", "text"] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      role="radio"
                      aria-checked={view === v}
                      className={styles.pill}
                      onClick={() => setView(v)}
                    >
                      {v === "html" ? "HTML" : "Plain text"}
                    </button>
                  ))}
                </div>
              ) : null}
              <span style={{ flex: 1 }} />
              <button
                type="button"
                className={styles.smallButton}
                disabled={pending || !hasContent}
                title={hasContent ? undefined : "The content of this email wasn't kept"}
                onClick={() => onResend(entry)}
              >
                Resend
              </button>
              <button
                type="button"
                className={`${styles.smallButton} ${styles.dangerButton}`}
                disabled={pending}
                onClick={() => onDelete(entry.id)}
              >
                Delete
              </button>
            </div>

            {!hasContent ? (
              <p className={styles.empty}>
                The content of this email wasn&apos;t kept. Emails sent before content storage was added, or while it is
                switched off under Storage, only keep their details.
              </p>
            ) : view === "html" && entry.body_html ? (
              <iframe title="Email preview" className={styles.previewFrame} srcDoc={entry.body_html} sandbox="" />
            ) : (
              <pre className={styles.previewText}>{entry.body_text}</pre>
            )}
          </div>
        ) : null}
      </div>
    </dialog>
  );
}
