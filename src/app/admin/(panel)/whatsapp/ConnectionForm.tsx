"use client";

import { startTransition, useActionState, useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import type { FormState } from "../../actions";
import { checkWhatsAppConnection, regenerateVerifyToken, saveWhatsAppConnection, sendWhatsAppTest } from "../../whatsapp-actions";
import styles from "../../admin.module.css";

const INITIAL: FormState = { status: "idle" };

type Props = {
  enabled: boolean;
  phoneNumberId: string;
  businessAccountId: string;
  graphVersion: string;
  displayNumber: string;
  tokenSet: boolean;
  appSecretSet: boolean;
  verifyToken: string;
  webhookUrl: string;
};

export function ConnectionForm(props: Props) {
  const [state, formAction, pending] = useActionState(saveWhatsAppConnection, INITIAL);
  const [tool, setTool] = useState<{ ok: boolean; message: string } | null>(null);
  const [busy, startTool] = useTransition();
  const [testTo, setTestTo] = useState("");
  const statusRef = useRef<HTMLParagraphElement>(null);
  const errors = state.errors ?? {};

  useEffect(() => {
    if (state.status !== "idle") statusRef.current?.focus();
  }, [state]);

  const run = (fn: () => Promise<{ ok: boolean; message: string }>) => {
    setTool(null);
    startTool(async () => setTool(await fn()));
  };

  const copy = (value: string) => {
    void navigator.clipboard?.writeText(value);
    setTool({ ok: true, message: "Copied." });
  };

  return (
    <section className={styles.card} aria-labelledby="wa-connection">
      <div className={styles.cardHead}>
        <h2 id="wa-connection" className={styles.cardTitle}>
          Connection
        </h2>
        <span className={styles.muted}>
          {props.displayNumber ? `Linked number: ${props.displayNumber}` : "Uses Meta's WhatsApp Cloud API."}
        </span>
      </div>

      <form
        className={styles.form}
        style={{ maxWidth: "none" }}
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
          <input type="checkbox" name="enabled" role="switch" defaultChecked={props.enabled} />
          <span>
            Use WhatsApp
            <span className={styles.switchHint}>
              {errors.enabled ?? "When off, incoming messages are still logged but nothing is sent."}
            </span>
          </span>
        </label>

        <Field id="wa-phone" label="Phone number ID" error={errors.phone_number_id} hint="Meta app → WhatsApp → API Setup. A long number, not your phone number.">
          <input id="wa-phone" name="phone_number_id" className={styles.input} defaultValue={props.phoneNumberId} inputMode="numeric" spellCheck={false} />
        </Field>
        <Field id="wa-waba" label="WhatsApp Business Account ID" error={errors.business_account_id} hint="Same page, under the phone number ID. Optional.">
          <input id="wa-waba" name="business_account_id" className={styles.input} defaultValue={props.businessAccountId} inputMode="numeric" spellCheck={false} />
        </Field>
        <Field
          id="wa-token"
          label="Access token"
          error={errors.access_token}
          hint={
            props.tokenSet
              ? "Saved and encrypted. Leave blank to keep it."
              : "Use a permanent System User token (Business settings → System users) with whatsapp_business_messaging. Temporary tokens stop after 24 hours."
          }
        >
          <input id="wa-token" name="access_token" type="password" className={styles.input} placeholder={props.tokenSet ? "••••••••••••" : ""} autoComplete="new-password" spellCheck={false} />
        </Field>
        <Field
          id="wa-secret"
          label="App secret"
          error={errors.app_secret}
          hint={props.appSecretSet ? "Saved and encrypted. Leave blank to keep it." : "Meta app → App settings → Basic. Proves incoming messages really come from Meta."}
        >
          <input id="wa-secret" name="app_secret" type="password" className={styles.input} placeholder={props.appSecretSet ? "••••••••••••" : ""} autoComplete="new-password" spellCheck={false} />
        </Field>
        <Field id="wa-version" label="Graph API version" error={errors.graph_version} hint="Leave as is unless Meta retires it.">
          <input id="wa-version" name="graph_version" className={styles.input} defaultValue={props.graphVersion} style={{ maxWidth: "8rem" }} spellCheck={false} />
        </Field>

        <div className={styles.formActions}>
          <Button type="submit" loading={pending} icon="check">
            {pending ? "Saving…" : "Save connection"}
          </Button>
        </div>
      </form>

      <div className={styles.stack} style={{ gap: "var(--space-3)" }}>
        <h3 className="label">Webhook (paste into Meta)</h3>
        <p className={styles.cardIntro}>
          Meta app → WhatsApp → Configuration → Webhook → Edit. Then subscribe to the <strong>messages</strong> field.
        </p>
        <dl className={styles.meta} style={{ display: "grid", gap: "var(--space-2)" }}>
          <div className={styles.inline}>
            <dt>Callback URL</dt>
            <dd>
              <code className={styles.code}>{props.webhookUrl}</code>
            </dd>
            <button type="button" className={styles.linkButton} onClick={() => copy(props.webhookUrl)}>
              Copy
            </button>
          </div>
          <div className={styles.inline}>
            <dt>Verify token</dt>
            <dd>
              <code className={styles.code}>{props.verifyToken}</code>
            </dd>
            <button type="button" className={styles.linkButton} onClick={() => copy(props.verifyToken)}>
              Copy
            </button>
            <button
              type="button"
              className={styles.linkButton}
              disabled={busy}
              onClick={() => window.confirm("Make a new verify token? You'll need to paste it into Meta again.") && run(regenerateVerifyToken)}
            >
              Make a new one
            </button>
          </div>
        </dl>
      </div>

      <div className={styles.stack} style={{ gap: "var(--space-3)" }}>
        <h3 className="label">Try it</h3>
        <div className={styles.inline}>
          <button type="button" className={styles.smallButton} disabled={busy} onClick={() => run(checkWhatsAppConnection)}>
            Check connection
          </button>
          <label className="visually-hidden" htmlFor="wa-test-to">
            Send a test message to
          </label>
          <input
            id="wa-test-to"
            type="tel"
            className={styles.input}
            placeholder="+234 803 000 0000"
            value={testTo}
            onChange={(e) => setTestTo(e.target.value)}
            style={{ maxWidth: "14rem" }}
          />
          <button
            type="button"
            className={styles.smallButton}
            disabled={busy || !testTo.trim()}
            onClick={() =>
              run(async () => {
                const r = await sendWhatsAppTest(testTo);
                return { ok: r.status === "sent", message: r.status === "sent" ? "Sent Meta's hello_world test message." : r.detail };
              })
            }
          >
            Send test
          </button>
        </div>
        <p className={styles.hint}>
          The test uses Meta&apos;s ready-made hello_world template, so it works even if that number has never messaged you.
        </p>
        {tool ? (
          <p className={styles.result} data-tone={tool.ok ? "ok" : "error"} role="status">
            {tool.message}
          </p>
        ) : null}
      </div>
    </section>
  );
}

export function Field({ id, label, hint, error, children }: { id: string; label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.fieldLabel}>
        {label}
      </label>
      {children}
      {error ? <p className={styles.fieldError}>{error}</p> : hint ? <p className={styles.hint}>{hint}</p> : null}
    </div>
  );
}
