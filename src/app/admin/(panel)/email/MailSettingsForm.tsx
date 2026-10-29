"use client";

import { startTransition, useActionState, useEffect, useId, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import type { Row } from "@/lib/supabase/database.types";
import type { FormState } from "../../actions";
import { saveMailSettings, sendTestEmail, testSmtpConnection } from "../../email-actions";
import styles from "../../admin.module.css";

const PRESETS = [
  { label: "Zoho, own domain", host: "smtppro.zoho.com", port: 465, security: "ssl", dkim: "zmail" },
  { label: "Zoho EU, own domain", host: "smtppro.zoho.eu", port: 465, security: "ssl", dkim: "zmail" },
  { label: "Zoho, personal", host: "smtp.zoho.com", port: 465, security: "ssl", dkim: "zmail" },
  { label: "Gmail / Google Workspace", host: "smtp.gmail.com", port: 465, security: "ssl", dkim: "google" },
  { label: "Resend", host: "smtp.resend.com", port: 465, security: "ssl", dkim: "resend" },
] as const;

const PROVIDER_HELP = {
  zoho: {
    username: "The full mailbox address, e.g. hello@layothedeveloper.com.",
    password: "Use a Zoho app password: Zoho Accounts → Security → App passwords → Generate.",
    from: "Must be the Zoho mailbox (or one of its aliases).",
    dkim: "Shown in Zoho next to your DKIM key (usually zmail). Used by the DNS check below.",
  },
  google: {
    username: "Your full Gmail or Google Workspace address.",
    password:
      "Use a Google app password: myaccount.google.com → Security → 2-Step Verification (must be on) → App passwords. Your normal Gmail password won't work.",
    from: "Workspace: any address on your domain. Personal Gmail: your Gmail address, or one added under Gmail → Settings → Accounts → Send mail as.",
    dkim: "Set in Google Admin when you turn on DKIM (usually google). Used by the DNS check below.",
  },
  resend: {
    username: "Always resend (the word itself, not an email address).",
    password: "A Resend API key with sending access: Resend → API Keys → Create API key.",
    from: "Any address on a domain you've verified in Resend → Domains.",
    dkim: "resend (Resend's key lives at resend._domainkey). Used by the DNS check below.",
  },
  other: {
    username: "Usually the full email address.",
    password: "Use an app password if your provider offers them.",
    from: "Must be an address your SMTP account is allowed to send as.",
    dkim: "Shown by your provider next to your DKIM key. Used by the DNS check below.",
  },
} as const;

function providerOf(host: string) {
  if (/zoho/i.test(host)) return "zoho";
  if (/gmail|google/i.test(host)) return "google";
  return /resend/i.test(host) ? "resend" : "other";
}

const INITIAL: FormState = { status: "idle" };
type ToolResult = { status: "sent" | "failed" | "skipped"; detail: string } | null;

function Field({
  label,
  hint,
  error,
  half,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  half?: boolean;
  children: (props: { id: string; "aria-describedby"?: string; "aria-invalid"?: true }) => React.ReactNode;
}) {
  const id = useId();
  const describedBy = [hint ? `${id}-h` : null, error ? `${id}-e` : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className={`${styles.field} ${half ? styles.half : ""}`}>
      <label htmlFor={id} className={styles.fieldLabel}>
        {label}
      </label>
      {children({ id, "aria-describedby": describedBy, "aria-invalid": error ? true : undefined })}
      {hint ? (
        <p id={`${id}-h`} className={styles.hint}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-e`} className={styles.fieldError}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function MailSettingsForm({
  settings,
  passwordSet,
  adminEmail,
}: {
  settings: Row<"mail_settings">;
  passwordSet: boolean;
  adminEmail: string;
}) {
  const [state, formAction, pending] = useActionState(saveMailSettings, INITIAL);
  const statusRef = useRef<HTMLParagraphElement>(null);
  const [server, setServer] = useState({ host: settings.host, port: String(settings.port), security: settings.security });
  const [showPassword, setShowPassword] = useState(false);
  const [dkim, setDkim] = useState(settings.dkim_selector);
  const help = PROVIDER_HELP[providerOf(server.host)];
  const [testTo, setTestTo] = useState(settings.notify_email || adminEmail);
  const [toolResult, setToolResult] = useState<ToolResult>(null);
  const [toolPending, startTool] = useTransition();
  const errors = state.errors ?? {};

  useEffect(() => {
    if (state.status !== "idle") statusRef.current?.focus();
  }, [state]);

  const runTool = (fn: () => Promise<ToolResult>) => {
    setToolResult(null);
    startTool(async () => setToolResult(await fn()));
  };

  return (
    <section className={styles.card} aria-labelledby="smtp-heading">
      <div className={styles.cardHead}>
        <h2 id="smtp-heading" className={styles.cardTitle}>
          SMTP connection
        </h2>
        <span className={styles.muted}>Mail goes out through your own mailbox (Zoho or Gmail), so it carries your domain&apos;s signatures.</span>
      </div>

      <form
        className={styles.form}
        style={{ maxWidth: "none", gap: "var(--space-6)" }}
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          startTransition(() => formAction(data));
        }}
      >
        {state.status !== "idle" && state.message ? (
          <p
            ref={statusRef}
            tabIndex={-1}
            role={state.status === "error" ? "alert" : "status"}
            className={state.status === "error" ? styles.alertError : styles.alertSuccess}
          >
            {state.message}
          </p>
        ) : null}

        <label className={styles.switch}>
          <input type="checkbox" name="enabled" defaultChecked={settings.enabled} role="switch" />
          <span>
            Send emails from the website
            <span className={styles.switchHint}>
              {errors.enabled ?? "When off, nothing is sent; submissions still arrive in the inbox."}
            </span>
          </span>
        </label>

        <fieldset className={styles.fieldset}>
          <legend className={`label ${styles.legend}`}>Server</legend>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Quick setup</span>
            <div className={styles.chips}>
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  className={styles.pill}
                  aria-pressed={server.host === p.host && server.port === String(p.port)}
                  onClick={() => {
                    setServer({ host: p.host, port: String(p.port), security: p.security });
                    setDkim(p.dkim);
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <p className={styles.hint}>
              If hello@layothedeveloper.com is a Zoho mailbox, use &ldquo;Zoho, own domain&rdquo; (or the EU option if your Zoho
              account lives at zoho.eu). Pick Gmail if you send through a Gmail or Google Workspace account instead. Gmail allows
              about 500 messages a day on a personal account and 2,000 on Workspace. Resend signs mail as your own domain on
              its free plan (100 a day), which Yahoo and Outlook require.
            </p>
          </div>
          <Field label="SMTP server" error={errors.host} half>
            {(p) => (
              <input
                {...p}
                name="host"
                className={styles.input}
                value={server.host}
                onChange={(e) => setServer({ ...server, host: e.target.value })}
                autoComplete="off"
                spellCheck={false}
              />
            )}
          </Field>
          <Field label="Port" error={errors.port} half>
            {(p) => (
              <input
                {...p}
                name="port"
                inputMode="numeric"
                className={styles.input}
                value={server.port}
                onChange={(e) => setServer({ ...server, port: e.target.value })}
              />
            )}
          </Field>
          <Field label="Security" half hint="SSL on port 465, or STARTTLS on port 587.">
            {(p) => (
              <select
                {...p}
                name="security"
                className={styles.input}
                value={server.security}
                onChange={(e) => setServer({ ...server, security: e.target.value })}
              >
                <option value="ssl">SSL / TLS</option>
                <option value="starttls">STARTTLS</option>
              </select>
            )}
          </Field>
          <Field label="Username" error={errors.username} half hint={help.username}>
            {(p) => (
              <input
                {...p}
                name="username"
                type="email"
                className={styles.input}
                defaultValue={settings.username}
                autoComplete="off"
                spellCheck={false}
              />
            )}
          </Field>
          <Field
            label="Password"
            error={errors.password}
            hint={
              passwordSet
                ? "Saved and encrypted. Leave blank to keep it."
                : help.password
            }
          >
            {(p) => (
              <div className={styles.inline}>
                <input
                  {...p}
                  name="password"
                  type={showPassword ? "text" : "password"}
                  className={styles.input}
                  placeholder={passwordSet ? "••••••••••••" : ""}
                  autoComplete="new-password"
                  spellCheck={false}
                />
                <button type="button" className={styles.smallButton} onClick={() => setShowPassword((v) => !v)}>
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            )}
          </Field>
          {passwordSet ? (
            <label className={styles.check}>
              <input type="checkbox" name="clear_password" />
              Remove the saved password
            </label>
          ) : null}
        </fieldset>

        <fieldset className={styles.fieldset}>
          <legend className={`label ${styles.legend}`}>Sender</legend>
          <Field label="Sender name" half hint="Shown as the sender in the inbox.">
            {(p) => <input {...p} name="from_name" className={styles.input} defaultValue={settings.from_name} maxLength={80} />}
          </Field>
          <Field label="Sender address" error={errors.from_email} half hint={help.from}>
            {(p) => (
              <input {...p} name="from_email" type="email" className={styles.input} defaultValue={settings.from_email} spellCheck={false} />
            )}
          </Field>
        </fieldset>

        <fieldset className={styles.fieldset}>
          <legend className={`label ${styles.legend}`}>Notifications to you</legend>
          <Field label="Send notifications to" error={errors.notify_email} hint="Leave blank to use the sender address.">
            {(p) => (
              <input
                {...p}
                name="notify_email"
                type="email"
                className={styles.input}
                defaultValue={settings.notify_email}
                placeholder={settings.from_email}
                spellCheck={false}
              />
            )}
          </Field>
          <label className={styles.switch}>
            <input type="checkbox" name="notify_enquiries" defaultChecked={settings.notify_enquiries} role="switch" />
            Email me about new service enquiries
          </label>
          <label className={styles.switch}>
            <input type="checkbox" name="notify_messages" defaultChecked={settings.notify_messages} role="switch" />
            Email me about new quick messages
          </label>
        </fieldset>

        <fieldset className={styles.fieldset}>
          <legend className={`label ${styles.legend}`}>Deliverability</legend>
          <Field
            label="DKIM selector"
            error={errors.dkim_selector}
            half
            hint={help.dkim}
          >
            {(p) => (
              <input
                {...p}
                name="dkim_selector"
                className={styles.input}
                value={dkim}
                onChange={(e) => setDkim(e.target.value)}
                spellCheck={false}
              />
            )}
          </Field>
        </fieldset>

        <div className={styles.formActions}>
          <Button type="submit" loading={pending} icon="check">
            {pending ? "Saving…" : "Save email settings"}
          </Button>
        </div>
      </form>

      <div className={styles.stack} style={{ gap: "var(--space-3)" }}>
        <h3 className="label">Try it</h3>
        <p className={styles.cardIntro}>Save first, then check the connection and send yourself a test.</p>
        <div className={styles.inline}>
          <button
            type="button"
            className={styles.smallButton}
            disabled={toolPending}
            onClick={() => runTool(() => testSmtpConnection())}
          >
            Test connection
          </button>
          <label className="visually-hidden" htmlFor="test-to">
            Send a test email to
          </label>
          <input
            id="test-to"
            type="email"
            className={styles.input}
            value={testTo}
            onChange={(e) => setTestTo(e.target.value)}
            spellCheck={false}
          />
          <button
            type="button"
            className={styles.smallButton}
            disabled={toolPending || !testTo}
            onClick={() => runTool(() => sendTestEmail(testTo))}
          >
            Send test email
          </button>
        </div>
        {toolPending ? (
          <p className={styles.result} data-tone="neutral" role="status">
            Working…
          </p>
        ) : toolResult ? (
          <p className={styles.result} data-tone={toolResult.status === "sent" ? "ok" : toolResult.status === "failed" ? "error" : "neutral"} role="status">
            {toolResult.status === "sent" ? "Done. " : toolResult.status === "skipped" ? "Not sent. " : "Failed. "}
            {toolResult.detail}
          </p>
        ) : null}
      </div>
    </section>
  );
}
