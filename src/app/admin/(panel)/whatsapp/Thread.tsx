"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { deleteWhatsAppConversation, replyWhatsApp } from "../../whatsapp-actions";
import styles from "../../admin.module.css";

export type ThreadMessage = {
  id: string;
  created_at: string;
  direction: string;
  kind: string;
  body: string;
  status: string;
  detail: string;
};

const timeFormat = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Lagos" });
const KIND: Record<string, string> = { autoreply: "Auto-reply", template: "Template", test: "Test", reply: "" };

export function Thread({
  waId,
  name,
  messages,
  replyOpen,
}: {
  waId: string;
  name: string;
  messages: ThreadMessage[];
  replyOpen: boolean;
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [notice, setNotice] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, start] = useTransition();

  const send = () =>
    start(async () => {
      const r = await replyWhatsApp(waId, text);
      setNotice({ ok: r.status === "sent", message: r.status === "sent" ? "Sent." : r.detail });
      if (r.status === "sent") setText("");
    });

  const remove = () => {
    if (!window.confirm(`Delete the whole conversation with ${name || `+${waId}`} from the log? It stays on your phone.`)) return;
    start(async () => {
      const r = await deleteWhatsAppConversation(waId);
      if (r.ok) router.push("/admin/whatsapp?tab=messages");
      else setNotice(r);
    });
  };

  return (
    <section className={styles.card} aria-labelledby="wa-thread">
      <div className={styles.cardHead}>
        <h2 id="wa-thread" className={styles.cardTitle}>
          {name || `+${waId}`}
        </h2>
        <span className={styles.textActions}>
          <a href={`https://wa.me/${waId}`} target="_blank" rel="noopener" className={styles.muted}>
            +{waId}
          </a>
          <button type="button" data-danger disabled={pending} onClick={remove}>
            Delete conversation
          </button>
        </span>
      </div>

      <ol className={styles.waThread}>
        {messages.map((m) => (
          <li key={m.id} data-dir={m.direction}>
            <p className={styles.waBubble} data-dir={m.direction}>
              {m.body || <span className={styles.muted}>(empty)</span>}
            </p>
            <span className={styles.kpiNote}>
              {timeFormat.format(new Date(m.created_at))}
              {m.direction === "out" ? (
                <>
                  {KIND[m.kind] ? ` · ${KIND[m.kind]}` : ""} ·{" "}
                  <span className={styles.tone} data-tone={m.status === "failed" ? "error" : m.status === "read" ? "ok" : "neutral"}>
                    {m.status}
                  </span>
                </>
              ) : null}
            </span>
            {m.status === "failed" && m.detail ? <span className={styles.fieldError}>{m.detail}</span> : null}
          </li>
        ))}
      </ol>

      {notice ? (
        <p role={notice.ok ? "status" : "alert"} className={notice.ok ? styles.alertSuccess : styles.alertError}>
          {notice.message}
        </p>
      ) : null}

      {replyOpen ? (
        <div className={styles.stack} style={{ gap: "var(--space-3)" }}>
          <label htmlFor="wa-reply" className={styles.fieldLabel}>
            Reply on WhatsApp
          </label>
          <textarea
            id="wa-reply"
            className={styles.input}
            rows={4}
            maxLength={4096}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className={styles.inline}>
            <Button type="button" icon="send" loading={pending} disabled={!text.trim()} onClick={send}>
              {pending ? "Sending…" : "Send"}
            </Button>
            <span className={styles.hint}>Sent from your business number. It also appears in the WhatsApp Business app.</span>
          </div>
        </div>
      ) : (
        <p className={styles.empty}>
          More than 24 hours have passed since {name || "this person"} last wrote, so WhatsApp won&apos;t accept a free-text reply.
          Reply from the WhatsApp Business app with a template, or wait for them to message again.
        </p>
      )}
    </section>
  );
}
