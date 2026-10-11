"use client";

import { useState, useTransition } from "react";
import { whatsappUrl } from "@/lib/format";
import { updateInboxItem } from "../../actions";
import { sendInboxReply } from "../../email-actions";
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

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Africa/Lagos",
});

export function InboxItem({ kind, entry, mail }: { kind: "enquiries" | "messages"; entry: InboxEntry; mail: MailEntry[] }) {
  const [status, setStatus] = useState(entry.status);
  const [notes, setNotes] = useState(entry.admin_notes);
  const [error, setError] = useState<string | null>(null);
  const [savedNotes, setSavedNotes] = useState(false);
  const [pending, startTransition] = useTransition();
  const [composing, setComposing] = useState(false);
  const [replySubject, setReplySubject] = useState("");
  const [replyBody, setReplyBody] = useState("");
  const [replyResult, setReplyResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [sending, startSending] = useTransition();

  const wa = whatsappUrl(entry.whatsapp);
  const defaultSubject = kind === "enquiries" ? `Re: your ${entry.service || "project"} enquiry` : "Re: your message";
  const subject = encodeURIComponent(defaultSubject);
  const firstName = entry.name.trim().split(/\s+/)[0] ?? "";

  function openComposer() {
    setReplySubject((s) => s || defaultSubject);
    setReplyBody((b) => b || `Hi ${firstName},\n\n`);
    setReplyResult(null);
    setComposing(true);
  }

  function sendReply() {
    startSending(async () => {
      const result = await sendInboxReply(kind, entry.id, replySubject, replyBody);
      if (result.status === "sent") {
        setReplyResult({ ok: true, text: `Sent to ${entry.email}.` });
        setComposing(false);
        setReplyBody("");
        if (status === "new") setStatus("replied");
      } else {
        setReplyResult({ ok: false, text: result.detail });
      }
    });
  }

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

      {mail.length > 0 ? (
        <ul className={styles.history} aria-label="Emails sent">
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
      ) : null}

      <div className={styles.mediaButtons}>
        <button type="button" className={styles.smallButton} onClick={openComposer} aria-expanded={composing}>
          Reply from hello@
        </button>
        <a href={`mailto:${entry.email}?subject=${subject}`} className={styles.smallButton}>
          Open in mail app
        </a>
        {wa ? (
          <a href={wa} target="_blank" rel="noopener" className={styles.smallButton}>
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

      {composing ? (
        <div className={styles.composer}>
          <p className={styles.muted}>
            To <strong>{entry.name}</strong> &lt;{entry.email}&gt;. Sent from your website mailbox and saved in the email log.
          </p>
          <label className="visually-hidden" htmlFor={`reply-subject-${entry.id}`}>
            Subject
          </label>
          <input
            id={`reply-subject-${entry.id}`}
            className={styles.input}
            value={replySubject}
            onChange={(e) => setReplySubject(e.target.value)}
            maxLength={200}
          />
          <label className="visually-hidden" htmlFor={`reply-body-${entry.id}`}>
            Message
          </label>
          <textarea
            id={`reply-body-${entry.id}`}
            className={styles.input}
            rows={8}
            value={replyBody}
            onChange={(e) => setReplyBody(e.target.value)}
            autoFocus
          />
          <div className={styles.mediaButtons}>
            <button type="button" className={styles.smallButton} onClick={sendReply} disabled={sending || !replyBody.trim()}>
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
