"use client";

import { startTransition, useActionState, useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import type { FormState } from "../../actions";
import { saveSpamSettings, testRecaptchaSecret } from "../../spam-actions";
import styles from "../../admin.module.css";

const INITIAL: FormState = { status: "idle" };

const LEVELS = [
  { value: 0.3, label: "Lenient", hint: "Blocks only obvious bots" },
  { value: 0.5, label: "Balanced", hint: "Recommended" },
  { value: 0.7, label: "Strict", hint: "May ask some people to retry" },
];

export function SpamForm({
  enabled,
  siteKey,
  minScore,
  secretSet,
}: {
  enabled: boolean;
  siteKey: string;
  minScore: number;
  secretSet: boolean;
}) {
  const [state, formAction, pending] = useActionState(saveSpamSettings, INITIAL);
  const [score, setScore] = useState(LEVELS.some((l) => Math.abs(l.value - minScore) < 0.01) ? Math.round(minScore * 10) / 10 : 0.5);
  const [test, setTest] = useState<{ ok: boolean; message: string } | null>(null);
  const [testing, startTest] = useTransition();
  const statusRef = useRef<HTMLParagraphElement>(null);
  const errors = state.errors ?? {};

  useEffect(() => {
    if (state.status !== "idle") statusRef.current?.focus();
  }, [state]);

  return (
    <section className={styles.card} aria-labelledby="recaptcha-heading">
      <h2 id="recaptcha-heading" className={styles.cardTitle}>
        Google reCAPTCHA
      </h2>
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
          <input type="checkbox" name="recaptcha_enabled" role="switch" defaultChecked={enabled} />
          <span>
            Check contact forms with reCAPTCHA
            <span className={styles.switchHint}>{errors.recaptcha_enabled ?? "Runs invisibly; no puzzles for visitors."}</span>
          </span>
        </label>

        <div className={styles.field}>
          <label htmlFor="recaptcha-site-key" className={styles.fieldLabel}>
            Site key
          </label>
          <input
            id="recaptcha-site-key"
            name="recaptcha_site_key"
            className={styles.input}
            defaultValue={siteKey}
            spellCheck={false}
            autoComplete="off"
            aria-invalid={errors.recaptcha_site_key ? true : undefined}
          />
          {errors.recaptcha_site_key ? <p className={styles.fieldError}>{errors.recaptcha_site_key}</p> : (
            <p className={styles.hint}>Public: it goes into the page.</p>
          )}
        </div>

        <div className={styles.field}>
          <label htmlFor="recaptcha-secret" className={styles.fieldLabel}>
            Secret key
          </label>
          <input
            id="recaptcha-secret"
            name="recaptcha_secret"
            type="password"
            className={styles.input}
            placeholder={secretSet ? "••••••••••••" : ""}
            spellCheck={false}
            autoComplete="new-password"
            aria-invalid={errors.recaptcha_secret ? true : undefined}
          />
          {errors.recaptcha_secret ? <p className={styles.fieldError}>{errors.recaptcha_secret}</p> : (
            <p className={styles.hint}>{secretSet ? "Saved and encrypted. Leave blank to keep it." : "Private: stored encrypted, never sent to the browser."}</p>
          )}
        </div>
        {secretSet ? (
          <label className={styles.check}>
            <input type="checkbox" name="clear_secret" />
            Remove the saved secret key
          </label>
        ) : null}

        <fieldset className={styles.field} style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className={styles.fieldLabel} style={{ marginBottom: "var(--space-2)" }}>
            Strictness
          </legend>
          <input type="hidden" name="recaptcha_min_score" value={score} />
          <div className={styles.chips} role="radiogroup" aria-label="Strictness">
            {LEVELS.map((l) => (
              <button
                key={l.value}
                type="button"
                role="radio"
                aria-checked={score === l.value}
                className={styles.pill}
                onClick={() => setScore(l.value)}
              >
                {l.label}
              </button>
            ))}
          </div>
          <p className={styles.hint}>
            {LEVELS.find((l) => l.value === score)?.hint}. Blocks scores under {score}.
          </p>
        </fieldset>

        <div className={`${styles.formActions} ${styles.formActionsStatic}`}>
          <Button type="submit" loading={pending} icon="check">
            {pending ? "Saving…" : "Save"}
          </Button>
          <button
            type="button"
            className={styles.smallButton}
            disabled={testing || !secretSet}
            title={secretSet ? undefined : "Save a secret key first"}
            onClick={() => startTest(async () => setTest(await testRecaptchaSecret()))}
          >
            {testing ? "Checking…" : "Check secret key"}
          </button>
        </div>
        {test ? (
          <p className={styles.result} data-tone={test.ok ? "ok" : "error"} role="status">
            {test.message}
          </p>
        ) : null}
      </form>
    </section>
  );
}
