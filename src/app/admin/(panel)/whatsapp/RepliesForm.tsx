"use client";

import { startTransition, useActionState, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { renderTemplate, SAMPLE_VARS, TEMPLATE_VARS } from "@/lib/mail/templates";
import type { FormState } from "../../actions";
import { saveWhatsAppReplies } from "../../whatsapp-actions";
import { Field } from "./ConnectionForm";
import styles from "../../admin.module.css";

const INITIAL: FormState = { status: "idle" };
const COOLDOWNS = [
  { hours: 1, label: "1 hour" },
  { hours: 6, label: "6 hours" },
  { hours: 12, label: "12 hours" },
  { hours: 24, label: "1 day" },
  { hours: 48, label: "2 days" },
  { hours: 72, label: "3 days" },
  { hours: 168, label: "1 week" },
];
// Tokens that make sense in a WhatsApp reply (there's no service or email here).
const TOKENS = TEMPLATE_VARS.filter((v) => v.key !== "service");

type Props = {
  autoreplyEnabled: boolean;
  body: string;
  cooldown: number;
  notifyEmail: boolean;
  templateEnabled: boolean;
  templateName: string;
  templateLang: string;
  brand: string;
};

export function RepliesForm(props: Props) {
  const [state, formAction, pending] = useActionState(saveWhatsAppReplies, INITIAL);
  const [body, setBody] = useState(props.body);
  const statusRef = useRef<HTMLParagraphElement>(null);
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const errors = state.errors ?? {};
  const preview = useMemo(() => renderTemplate(body, { ...SAMPLE_VARS, site_name: props.brand }), [body, props.brand]);

  useEffect(() => {
    if (state.status !== "idle") statusRef.current?.focus();
  }, [state]);

  const insert = (key: string) => {
    const el = areaRef.current;
    const token = `{{${key}}}`;
    if (!el) return setBody((b) => b + token);
    const { selectionStart: a, selectionEnd: b } = el;
    setBody((v) => v.slice(0, a) + token + v.slice(b));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(a + token.length, a + token.length);
    });
  };

  return (
    <form
      className={styles.sections}
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

      <section className={styles.card} aria-labelledby="wa-auto">
        <div className={styles.cardHead}>
          <h2 id="wa-auto" className={styles.cardTitle}>
            Auto-reply to incoming messages
          </h2>
          <span className={styles.muted}>Sent when someone messages your WhatsApp Business number.</span>
        </div>
        <label className={styles.switch}>
          <input type="checkbox" name="autoreply_enabled" role="switch" defaultChecked={props.autoreplyEnabled} />
          <span>
            Send an automatic reply
            <span className={styles.switchHint}>Free text is allowed here because the person wrote first.</span>
          </span>
        </label>
        <div className={styles.split}>
          <div className={styles.stack}>
            <Field id="wa-body" label="Message" error={errors.autoreply_body} hint={`${body.length} / 1,024 characters. *bold* and _italic_ work in WhatsApp.`}>
              <textarea
                id="wa-body"
                ref={areaRef}
                name="autoreply_body"
                className={styles.input}
                rows={9}
                maxLength={1024}
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
            </Field>
            <div className={styles.chips} aria-label="Insert a placeholder">
              {TOKENS.map((t) => (
                <button key={t.key} type="button" className={styles.pill} onClick={() => insert(t.key)}>
                  {t.label}
                </button>
              ))}
            </div>
            <Field id="wa-cooldown" label="Reply to the same number at most once every" error={errors.autoreply_cooldown_hours}>
              <select id="wa-cooldown" name="autoreply_cooldown_hours" className={styles.input} defaultValue={String(props.cooldown)} style={{ maxWidth: "12rem" }}>
                {COOLDOWNS.map((c) => (
                  <option key={c.hours} value={c.hours}>
                    {c.label}
                  </option>
                ))}
              </select>
            </Field>
            <label className={styles.switch}>
              <input type="checkbox" name="notify_email" role="switch" defaultChecked={props.notifyEmail} />
              <span>
                Email me when a new WhatsApp conversation starts
                <span className={styles.switchHint}>Once per conversation, using the same timing as the auto-reply.</span>
              </span>
            </label>
          </div>
          <div className={styles.stack}>
            <span className={styles.fieldLabel}>Preview</span>
            <div className={styles.waPhone}>
              <p className={styles.waBubble} data-dir="out">
                {preview || <span className={styles.muted}>Nothing to send yet.</span>}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.card} aria-labelledby="wa-form">
        <div className={styles.cardHead}>
          <h2 id="wa-form" className={styles.cardTitle}>
            Message visitors who leave a WhatsApp number
          </h2>
          <span className={styles.muted}>After a service enquiry with a WhatsApp number.</span>
        </div>
        <p className={styles.cardIntro}>
          WhatsApp only lets a business start a conversation with an <strong>approved template</strong>. Create one in WhatsApp
          Manager → Message templates (category: Utility) with one variable for the first name, for example:
          <br />
          <em>
            Hi {"{{1}}"}, thanks for your enquiry on layothedeveloper.com. I&apos;ve got your details and will be in touch shortly. You can
            reply here any time.
          </em>
          <br />
          Once Meta approves it, enter its name below.
        </p>
        <label className={styles.switch}>
          <input type="checkbox" name="form_template_enabled" role="switch" defaultChecked={props.templateEnabled} />
          <span>
            Send the template after an enquiry
            <span className={styles.switchHint}>{errors.form_template_enabled ?? "Nigerian numbers starting with 0 are converted to +234 automatically."}</span>
          </span>
        </label>
        <div className={styles.inline} style={{ alignItems: "flex-start" }}>
          <Field id="wa-tpl" label="Template name" error={errors.form_template_name} hint="Exactly as in WhatsApp Manager, e.g. enquiry_received.">
            <input id="wa-tpl" name="form_template_name" className={styles.input} defaultValue={props.templateName} spellCheck={false} />
          </Field>
          <Field id="wa-lang" label="Language" error={errors.form_template_lang} hint="e.g. en, en_GB, en_US.">
            <input id="wa-lang" name="form_template_lang" className={styles.input} defaultValue={props.templateLang} spellCheck={false} style={{ maxWidth: "8rem" }} />
          </Field>
        </div>
      </section>

      <div className={styles.formActions}>
        <Button type="submit" loading={pending} icon="check">
          {pending ? "Saving…" : "Save replies"}
        </Button>
      </div>
    </form>
  );
}
