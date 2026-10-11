"use client";

import { startTransition, useActionState, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { renderTemplate, SAMPLE_VARS, TEMPLATE_VARS, textEmailHtml } from "@/lib/mail/templates";
import type { FormState } from "../../actions";
import { saveMailTemplate, sendTemplatePreview } from "../../email-actions";
import styles from "../../admin.module.css";

const INITIAL: FormState = { status: "idle" };

type Template = { key: string; label: string; enabled: boolean; subject: string; body: string };

export function TemplateEditor({
  template,
  adminEmail,
  brand,
  footer,
  siteUrl,
}: {
  template: Template;
  adminEmail: string;
  brand: string;
  footer: string;
  siteUrl: string;
}) {
  const action = saveMailTemplate.bind(null, template.key);
  const [state, formAction, pending] = useActionState(action, INITIAL);
  const [subject, setSubject] = useState(template.subject);
  const [body, setBody] = useState(template.body);
  const [enabled, setEnabled] = useState(template.enabled);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const statusRef = useRef<HTMLParagraphElement>(null);
  const [previewResult, setPreviewResult] = useState<string | null>(null);
  const [previewPending, startPreview] = useTransition();
  const dirty = subject !== template.subject || body !== template.body || enabled !== template.enabled;

  useEffect(() => {
    if (state.status !== "idle") statusRef.current?.focus();
  }, [state]);

  const vars = useMemo(() => ({ ...SAMPLE_VARS, site_name: brand, site_url: siteUrl.replace(/^https?:\/\//, "") }), [brand, siteUrl]);
  const previewHtml = useMemo(() => textEmailHtml(renderTemplate(body, vars), brand, footer), [body, vars, brand, footer]);

  const insert = (token: string) => {
    const el = bodyRef.current;
    if (!el) return;
    const start = el.selectionStart ?? body.length;
    const end = el.selectionEnd ?? body.length;
    const next = body.slice(0, start) + token + body.slice(end);
    setBody(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + token.length, start + token.length);
    });
  };

  const headingId = `tpl-${template.key}`;

  return (
    <section className={styles.card} aria-labelledby={headingId}>
      <div className={styles.cardHead}>
        <h2 id={headingId} className={styles.cardTitle}>
          {template.label}
        </h2>
        <span className={styles.tone} data-tone={template.enabled ? "ok" : "neutral"}>
          {template.enabled ? "On" : "Off"}
        </span>
      </div>

      <div className={styles.split}>
        <form
          className={styles.stack}
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
            <input type="checkbox" name="enabled" role="switch" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
            <span>
              Reply automatically
              <span className={styles.switchHint}>
                {template.key === "enquiry_autoreply" ? "After a service enquiry." : "After a quick message."}
              </span>
            </span>
          </label>

          <div className={styles.field}>
            <label htmlFor={`${headingId}-subject`} className={styles.fieldLabel}>
              Subject
            </label>
            <input
              id={`${headingId}-subject`}
              name="subject"
              className={styles.input}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={200}
              aria-invalid={state.errors?.subject ? true : undefined}
            />
            {state.errors?.subject ? <p className={styles.fieldError}>{state.errors.subject}</p> : null}
          </div>

          <div className={styles.field}>
            <label htmlFor={`${headingId}-body`} className={styles.fieldLabel}>
              Message
            </label>
            <textarea
              id={`${headingId}-body`}
              ref={bodyRef}
              name="body"
              className={styles.input}
              rows={12}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={5000}
              aria-invalid={state.errors?.body ? true : undefined}
            />
            {state.errors?.body ? <p className={styles.fieldError}>{state.errors.body}</p> : null}
            <p className={styles.hint}>Plain text. Leave a blank line between paragraphs. Links become clickable.</p>
          </div>

          <div className={styles.field}>
            <span className={styles.fieldLabel}>Insert a detail</span>
            <div className={styles.chips}>
              {TEMPLATE_VARS.map((v) => (
                <button key={v.key} type="button" className={styles.chip} onClick={() => insert(`{{${v.key}}}`)} title={`e.g. ${v.sample}`}>
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          <div className={`${styles.formActions} ${styles.formActionsStatic}`}>
            <Button type="submit" loading={pending} icon="check">
              {pending ? "Saving…" : dirty ? "Save changes" : "Saved"}
            </Button>
            <button
              type="button"
              className={styles.smallButton}
              disabled={previewPending || dirty}
              title={dirty ? "Save first" : undefined}
              onClick={() =>
                startPreview(async () => {
                  const r = await sendTemplatePreview(template.key, adminEmail);
                  setPreviewResult(r.status === "sent" ? `Preview sent to ${adminEmail}.` : `Not sent: ${r.detail}`);
                })
              }
            >
              {previewPending ? "Sending…" : "Email me a preview"}
            </button>
            {previewResult ? (
              <span className={styles.muted} role="status">
                {previewResult}
              </span>
            ) : null}
          </div>
        </form>

        <div className={styles.stack} style={{ gap: "var(--space-3)", alignContent: "start" }}>
          <div className={styles.previewMeta}>
            <span className="label">Preview, with sample details</span>
            <span>
              <strong>Subject:</strong> {renderTemplate(subject, vars) || <em className={styles.muted}>No subject</em>}
            </span>
          </div>
          <iframe title={`${template.label} preview`} className={styles.previewFrame} srcDoc={previewHtml} sandbox="" />
        </div>
      </div>
    </section>
  );
}
