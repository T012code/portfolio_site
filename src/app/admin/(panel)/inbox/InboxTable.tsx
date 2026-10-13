"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { whatsappUrl } from "@/lib/format";
import { updateInboxItem } from "../../actions";
import { sendInboxReply } from "../../email-actions";
import styles from "../../admin.module.css";
import { statusLabel } from "./labels";

export type InboxRow = {
  kind: "enquiries" | "messages";
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

export type MailEntry = { kind: string; status: string; created_at: string; subject: string; detail: string };

const MAIL_KIND: Record<string, string> = {
  notification: "Notification to you",
  autoreply: "Automatic reply",
  reply: "Your reply",
  test: "Test",
};

const STATUSES = {
  enquiries: ["new", "booked", "replied", "archived"],
  messages: ["new", "replied", "archived"],
} as const;

const dateFormat = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Lagos" });
const shortDate = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "Africa/Lagos" });
const shortTime = new Intl.DateTimeFormat("en-GB", { timeStyle: "short", timeZone: "Africa/Lagos" });
const dayKey = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos" });

/** Today's items show the time, older ones the date. */
function when(iso: string, today: string) {
  const d = new Date(iso);
  return dayKey.format(d) === today ? shortTime.format(d) : shortDate.format(d);
}

const typeLabel = (row: InboxRow) => (row.kind === "enquiries" ? "Enquiry" : "Message");


export function InboxTable({
  rows,
  mail,
  today,
}: {
  rows: InboxRow[];
  mail: Record<string, MailEntry[]>;
  /** Today in Lagos as YYYY-MM-DD, from the server so both renders agree. */
  today: string;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  // Status changes show at once; the server refresh then confirms them.
  const [statusOverride, setStatusOverride] = useState<Record<string, string>>({});
  const statusOf = (row: InboxRow) => statusOverride[row.id] ?? row.status;

  const index = rows.findIndex((r) => r.id === openId);
  const open = index >= 0 ? rows[index] : null;

  return (
    <>
      <div className={styles.tableWrap}>
        <table className={`${styles.table} ${styles.inboxTable}`}>
          <thead>
            <tr>
              <th scope="col">Received</th>
              <th scope="col">From</th>
              <th scope="col" className={styles.wideOnly}>
                Type
              </th>
              <th scope="col" className={`${styles.subjectCell} ${styles.wideOnly}`}>
                Message
              </th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const status = statusOf(row);
              return (
                <tr key={row.id} data-new={status === "new" || undefined} onClick={() => setOpenId(row.id)}>
                  <td className={styles.nowrap} title={dateFormat.format(new Date(row.created_at))}>
                    {when(row.created_at, today)}
                  </td>
                  <td>
                    <div className={styles.fromCell}>
                      <button type="button" className={styles.subjectButton} onClick={() => setOpenId(row.id)}>
                        {row.name}
                      </button>
                      <span className={styles.muted}>{row.email}</span>
                    </div>
                  </td>
                  <td className={`${styles.nowrap} ${styles.wideOnly}`}>
                    {typeLabel(row)}
                    {row.service ? <span className={styles.muted}> · {row.service}</span> : null}
                  </td>
                  <td className={`${styles.subjectCell} ${styles.wideOnly}`}>
                    <span className={styles.preview}>{row.message}</span>
                  </td>
                  <td>
                    <span className={styles.status} data-status={status}>
                      {statusLabel(status)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <InboxDialog
        key={open?.id ?? "none"}
        row={open}
        status={open ? statusOf(open) : ""}
        mail={open ? (mail[open.id] ?? []) : []}
        onStatus={(id, s) => setStatusOverride((prev) => ({ ...prev, [id]: s }))}
        onClose={() => setOpenId(null)}
        onPrev={index > 0 ? () => setOpenId(rows[index - 1].id) : undefined}
        onNext={index >= 0 && index < rows.length - 1 ? () => setOpenId(rows[index + 1].id) : undefined}
      />
    </>
  );
}

function InboxDialog({
  row,
  status,
  mail,
  onStatus,
  onClose,
  onPrev,
  onNext,
}: {
  row: InboxRow | null;
  status: string;
  mail: MailEntry[];
  onStatus: (id: string, status: string) => void;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const replyRef = useRef<HTMLButtonElement>(null);
  const [notes, setNotes] = useState(row?.admin_notes ?? "");
  const [savedNotes, setSavedNotes] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [composing, setComposing] = useState(false);
  const [replySubject, setReplySubject] = useState("");
  const [replyBody, setReplyBody] = useState("");
  const [replyResult, setReplyResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [sending, startSending] = useTransition();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (row && !dialog.open) {
      dialog.showModal();
      replyRef.current?.focus();
    }
    if (!row && dialog.open) dialog.close();
  }, [row]);

  if (!row) return <dialog ref={ref} className={styles.dialog} onClose={onClose} />;

  const wa = whatsappUrl(row.whatsapp);
  const defaultSubject = row.kind === "enquiries" ? `Re: your ${row.service || "project"} enquiry` : "Re: your message";
  const mailto = `mailto:${row.email}?subject=${encodeURIComponent(defaultSubject)}`;
  const firstName = row.name.trim().split(/\s+/)[0] ?? "";

  function save(patch: { status?: string; admin_notes?: string }, rollback?: () => void) {
    if (!row) return;
    setError(null);
    startTransition(async () => {
      try {
        await updateInboxItem(row.kind, row.id, patch);
        if (patch.admin_notes !== undefined) setSavedNotes(true);
      } catch (e) {
        rollback?.();
        setError((e as Error).message);
      }
    });
  }

  function setStatus(next: string) {
    if (!row || next === status) return;
    const previous = status;
    onStatus(row.id, next);
    save({ status: next }, () => onStatus(row.id, previous));
  }

  function openComposer() {
    setReplySubject((s) => s || defaultSubject);
    setReplyBody((b) => b || `Hi ${firstName},\n\n`);
    setReplyResult(null);
    setComposing(true);
  }

  function sendReply() {
    if (!row) return;
    startSending(async () => {
      const result = await sendInboxReply(row.kind, row.id, replySubject, replyBody);
      if (result.status === "sent") {
        setReplyResult({ ok: true, text: `Sent to ${row.email}.` });
        setComposing(false);
        setReplyBody("");
        if (status === "new") onStatus(row.id, "replied");
      } else {
        setReplyResult({ ok: false, text: result.detail });
      }
    });
  }

  const details: [string, string | undefined | null][] = [
    ["Received", dateFormat.format(new Date(row.created_at))],
    ["Email", row.email],
    ["WhatsApp", row.whatsapp],
    ["Service", row.service],
    ["Budget", row.budget],
    ["Timeline", row.timeline],
    ["Company", row.company],
    ["Call", row.booking_start ? dateFormat.format(new Date(row.booking_start)) : null],
  ];

  return (
    <dialog ref={ref} className={`${styles.dialog} ${styles.inboxDialog}`} onClose={onClose} aria-labelledby="inbox-title">
      <div className={styles.dialogHead}>
        <div style={{ minWidth: 0 }}>
          <p className={styles.muted}>
            {typeLabel(row)}
            {row.service ? ` · ${row.service}` : ""}
          </p>
          <h2 id="inbox-title" className={styles.cardTitle}>
            {row.name}
          </h2>
        </div>
        <div className={styles.dialogNav}>
          <button type="button" className={styles.smallButton} onClick={onPrev} disabled={!onPrev} aria-label="Newer item">
            ↑
          </button>
          <button type="button" className={styles.smallButton} onClick={onNext} disabled={!onNext} aria-label="Older item">
            ↓
          </button>
          <button type="button" className={styles.smallButton} onClick={onClose}>
            Close
          </button>
        </div>
      </div>

      <div className={`${styles.dialogBody} ${styles.stack}`}>
        <div className={styles.mediaButtons}>
          <button
            type="button"
            className={`${styles.smallButton} ${styles.primaryButton}`}
            onClick={openComposer}
            aria-expanded={composing}
            ref={replyRef}
          >
            Reply from hello@
          </button>
          <a href={mailto} className={styles.smallButton}>
            Open in mail app
          </a>
          {wa ? (
            <a href={wa} target="_blank" rel="noopener" className={styles.smallButton}>
              WhatsApp
            </a>
          ) : null}
        </div>

        {composing ? (
          <div className={styles.composer}>
            <p className={styles.muted}>
              To <strong>{row.name}</strong> &lt;{row.email}&gt;. Sent from your website mailbox and saved in the email log.
            </p>
            <label className="visually-hidden" htmlFor="reply-subject">
              Subject
            </label>
            <input
              id="reply-subject"
              className={styles.input}
              value={replySubject}
              onChange={(e) => setReplySubject(e.target.value)}
              maxLength={200}
            />
            <label className="visually-hidden" htmlFor="reply-body">
              Message
            </label>
            <textarea
              id="reply-body"
              className={styles.input}
              rows={8}
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              autoFocus
            />
            <div className={styles.mediaButtons}>
              <button type="button" className={`${styles.smallButton} ${styles.primaryButton}`} onClick={sendReply} disabled={sending || !replyBody.trim()}>
                {sending ? "Sending…" : "Send reply"}
              </button>
              <button type="button" className={styles.smallButton} onClick={() => setComposing(false)} disabled={sending}>
                Cancel
              </button>
            </div>
          </div>
        ) : null}
        {replyResult ? (
          <p className={replyResult.ok ? styles.alertSuccess : styles.alertError} role={replyResult.ok ? "status" : "alert"}>
            {replyResult.text}
          </p>
        ) : null}

        <div className={styles.mediaButtons} role="radiogroup" aria-label="Status">
          {STATUSES[row.kind].map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={status === s}
              className={styles.pill}
              disabled={pending}
              onClick={() => setStatus(s)}
            >
              {statusLabel(s)}
            </button>
          ))}
        </div>

        <dl className={styles.detailGrid}>
          {details
            .filter(([, v]) => v)
            .map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
        </dl>

        <div className={styles.messageBox}>
          <p className={styles.message}>{row.message}</p>
        </div>

        {mail.length > 0 ? (
          <section aria-labelledby="inbox-mail">
            <h3 id="inbox-mail" className={styles.fieldLabel}>
              Emails sent
            </h3>
            <ul className={styles.history}>
              {mail.map((m, i) => (
                <li key={i}>
                  <span className={styles.tone} data-tone={m.status === "sent" ? "ok" : m.status === "failed" ? "error" : "neutral"}>
                    {m.status}
                  </span>
                  <span>{MAIL_KIND[m.kind] ?? m.kind}</span>
                  <span className={styles.muted}>{dateFormat.format(new Date(m.created_at))}</span>
                  {m.status !== "sent" && m.detail ? <span className={styles.muted}>· {m.detail}</span> : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <div className={styles.stack} style={{ gap: "var(--space-2)" }}>
          <label htmlFor="inbox-notes" className={styles.fieldLabel}>
            Private notes
          </label>
          <textarea
            id="inbox-notes"
            className={styles.input}
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
              setSavedNotes(false);
            }}
            rows={3}
            placeholder="Only you can see these."
          />
          <div className={styles.mediaButtons}>
            <button
              type="button"
              className={styles.smallButton}
              onClick={() => save({ admin_notes: notes })}
              disabled={pending || notes === row.admin_notes}
            >
              Save notes
            </button>
            {savedNotes ? <span className={styles.muted}>Saved</span> : null}
          </div>
        </div>

        {error ? (
          <p className={styles.alertError} role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </dialog>
  );
}
