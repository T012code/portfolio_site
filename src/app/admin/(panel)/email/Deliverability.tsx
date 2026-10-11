"use client";

import { useEffect, useState, useTransition } from "react";
import type { DnsCheck } from "@/lib/mail/dns";
import { checkDeliverability } from "../../email-actions";
import styles from "../../admin.module.css";

const TONE_LABEL: Record<DnsCheck["status"], string> = {
  ok: "Set up",
  warn: "Check",
  missing: "Missing",
  error: "Couldn't check",
};

function Copyable({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className={styles.codeRow}>
      <code>{value}</code>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1600);
          } catch {
            // Clipboard blocked: the value is still selectable.
          }
        }}
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

export function Deliverability({ fromEmail }: { fromEmail: string }) {
  const [result, setResult] = useState<Awaited<ReturnType<typeof checkDeliverability>> | null>(null);
  const [pending, start] = useTransition();

  const run = () => start(async () => setResult(await checkDeliverability()));

  useEffect(run, []);

  const checks = result && "checks" in result ? result.checks : [];
  const passed = checks.filter((c) => c.status === "ok").length;

  return (
    <section className={styles.card} aria-labelledby="dns-heading">
      <div className={styles.cardHead}>
        <h2 id="dns-heading" className={styles.cardTitle}>
          Keep mail out of spam
        </h2>
        <button type="button" className={styles.smallButton} onClick={run} disabled={pending}>
          {pending ? "Checking…" : "Check again"}
        </button>
      </div>
      <p className={styles.cardIntro}>
        Receivers trust mail when the domain proves who may send for it. These four DNS records do that, and the expected values
        follow the SMTP server you saved (Zoho or Google). Add any that are missing at your DNS host (Cloudflare, once the domain
        moves there), then check again. Changes can take up to an hour to show.
      </p>

      {result && "info" in result ? (
        <p className={styles.result} data-tone="neutral" role="status">
          {result.info}
        </p>
      ) : null}

      {result && "error" in result ? (
        <p className={styles.alertError} role="alert">
          {result.error}
        </p>
      ) : null}

      {checks.length > 0 ? (
        <>
          <p className={styles.muted} role="status">
            {passed} of {checks.length} in place for <strong>{"domain" in result! ? result.domain : fromEmail.split("@")[1]}</strong>.
          </p>
          <div>
            {checks.map((c) => (
              <div key={c.key} className={styles.dnsRow}>
                <div className={styles.dnsHead}>
                  <strong>{c.label}</strong>
                  <span className={styles.tone} data-tone={c.status === "error" ? "warn" : c.status}>
                    {TONE_LABEL[c.status]}
                  </span>
                </div>
                <p className={styles.muted}>{c.note}</p>
                {c.found.length > 0 ? (
                  <details>
                    <summary className={styles.muted} style={{ cursor: "pointer" }}>
                      Current value{c.found.length > 1 ? "s" : ""}
                    </summary>
                    <div className={styles.stack} style={{ gap: "var(--space-1)", marginTop: "var(--space-2)" }}>
                      {c.found.map((f) => (
                        <code key={f} className={styles.code}>
                          {f}
                        </code>
                      ))}
                    </div>
                  </details>
                ) : null}
                {c.status !== "ok" ? (
                  <div className={styles.stack} style={{ gap: "var(--space-1)" }}>
                    <span className={styles.hint}>
                      {c.key === "mx" ? "MX records" : "TXT record"} at <strong>{c.host}</strong>
                      {c.key === "dkim" ? "" : ", value:"}
                    </span>
                    {c.key === "dkim" ? <p className={styles.hint}>{c.expected}</p> : <Copyable value={c.expected} />}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </>
      ) : pending ? (
        <p className={styles.muted} role="status">
          Looking up DNS records…
        </p>
      ) : null}

      <details>
        <summary className={styles.fieldLabel} style={{ cursor: "pointer" }}>
          More ways to stay out of spam
        </summary>
        <ul className={styles.stack} style={{ gap: "var(--space-2)", marginTop: "var(--space-3)", paddingLeft: "1.25rem", fontSize: "var(--text-small)" }}>
          <li>Send from the same address you sign in with (or an alias set up in Zoho or Gmail). Mismatches are the most common cause of rejections.</li>
          <li>Use an app password, not your main password. If it leaks, you revoke it without changing your login.</li>
          <li>Use one provider per domain. If hello@ lives in Zoho, send through Zoho; switching to Google means moving the mailbox and the DNS records too.</li>
          <li>Keep automatic replies short and personal. Links to your own domain are fine; avoid link shorteners.</li>
          <li>Send yourself a test and open it in Gmail: &ldquo;Show original&rdquo; should list SPF, DKIM and DMARC as PASS.</li>
          <li>Start DMARC at p=none if you&apos;re unsure, watch the reports for a week, then move to p=quarantine.</li>
        </ul>
      </details>
    </section>
  );
}
