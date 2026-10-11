"use client";

import { startTransition, useActionState, useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import type { FormState } from "../../actions";
import { addAdmin, changePassword, removeAdmin, signOutEverywhereElse } from "../../email-actions";
import styles from "../../admin.module.css";

const INITIAL: FormState = { status: "idle" };

export function PasswordForm() {
  const [state, formAction, pending] = useActionState(changePassword, INITIAL);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.status === "success") formRef.current?.reset();
  }, [state]);

  return (
    <form
      ref={formRef}
      className={styles.stack}
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => formAction(data));
      }}
    >
      {state.status !== "idle" && state.message ? (
        <p role={state.status === "error" ? "alert" : "status"} className={state.status === "error" ? styles.alertError : styles.alertSuccess}>
          {state.message}
        </p>
      ) : null}
      <div className={styles.field}>
        <label htmlFor="new-password" className={styles.fieldLabel}>
          New password
        </label>
        <input
          id="new-password"
          name="password"
          type="password"
          className={styles.input}
          autoComplete="new-password"
          minLength={12}
          aria-invalid={state.errors?.password ? true : undefined}
        />
        <p className={styles.hint}>At least 12 characters.</p>
      </div>
      <div className={styles.field}>
        <label htmlFor="confirm-password" className={styles.fieldLabel}>
          Type it again
        </label>
        <input
          id="confirm-password"
          name="confirm"
          type="password"
          className={styles.input}
          autoComplete="new-password"
          aria-invalid={state.errors?.confirm ? true : undefined}
        />
      </div>
      <div>
        <Button type="submit" loading={pending} icon="check">
          {pending ? "Saving…" : "Change password"}
        </Button>
      </div>
    </form>
  );
}

export function SessionTools() {
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className={styles.stack} style={{ gap: "var(--space-2)" }}>
      <div>
        <button
          type="button"
          className={styles.smallButton}
          disabled={pending}
          onClick={() => start(async () => setResult(await signOutEverywhereElse()))}
        >
          {pending ? "Signing out…" : "Sign out of other devices"}
        </button>
      </div>
      {result ? (
        <p className={result.ok ? styles.alertSuccess : styles.alertError} role="status">
          {result.message}
        </p>
      ) : null}
    </div>
  );
}

export function AccessManager({ admins, self }: { admins: { email: string; since: string }[]; self: string }) {
  const [email, setEmail] = useState("");
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className={styles.stack}>
      <ul className={styles.list}>
        {admins.map((a) => (
          <li key={a.email} className={styles.row} style={{ gridTemplateColumns: "minmax(0, 1fr) auto" }}>
            <div className={styles.rowMain}>
              <span className={styles.rowTitle} style={{ textDecoration: "none" }}>
                {a.email}
                {a.email === self.toLowerCase() ? <span className={styles.muted}> (you)</span> : null}
              </span>
              <span className={styles.rowSub}>Since {a.since}</span>
            </div>
            <div className={styles.rowActions}>
              {a.email !== self.toLowerCase() ? (
                <button
                  type="button"
                  className={`${styles.smallButton} ${styles.dangerButton}`}
                  disabled={pending}
                  onClick={() => {
                    if (!window.confirm(`Remove dashboard access for ${a.email}?`)) return;
                    start(async () => setResult(await removeAdmin(a.email)));
                  }}
                >
                  Remove
                </button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
      <form
        className={styles.inline}
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const r = await addAdmin(email);
            setResult(r);
            if (r.ok) setEmail("");
          });
        }}
      >
        <label htmlFor="add-admin" className="visually-hidden">
          Email address to add
        </label>
        <input
          id="add-admin"
          type="email"
          className={styles.input}
          placeholder="name@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          spellCheck={false}
        />
        <button type="submit" className={styles.smallButton} disabled={pending || !email}>
          Add person
        </button>
      </form>
      {result ? (
        <p className={result.ok ? styles.alertSuccess : styles.alertError} role="status">
          {result.message}
        </p>
      ) : null}
    </div>
  );
}
