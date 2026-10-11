"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Mark } from "@/components/brand/Mark";
import { Button } from "@/components/ui/Button";
import { getBrowserClient } from "@/lib/supabase/browser";
import styles from "../admin.module.css";

type Step =
  | { kind: "loading" }
  | { kind: "password" }
  | { kind: "enroll"; factorId: string; qr: string; secret: string }
  | { kind: "verify"; factorId: string };

export function LoginFlow({ initialError }: { initialError?: string }) {
  const router = useRouter();
  const supabase = getBrowserClient();
  const [step, setStep] = useState<Step>({ kind: "loading" });
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [pending, startTransition] = useTransition();

  // Work out where an existing session stands: no session, needs MFA setup, needs a code, or done.
  async function resolveStep() {
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (!aal || !aal.currentLevel) return setStep({ kind: "password" });
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) return setStep({ kind: "password" });
    if (aal.currentLevel === "aal2") {
      router.replace("/admin");
      router.refresh();
      return;
    }
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const verified = factors?.totp.find((f) => f.status === "verified");
    if (verified) return setStep({ kind: "verify", factorId: verified.id });

    // Clear half-finished enrolments before starting a fresh one.
    for (const f of factors?.all ?? []) {
      if (f.status !== "verified") await supabase.auth.mfa.unenroll({ factorId: f.id });
    }
    const { data: enrolled, error: enrollError } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "Portfolio admin",
    });
    if (enrollError || !enrolled) {
      setError(enrollError?.message ?? "Couldn't start authenticator setup.");
      return setStep({ kind: "password" });
    }
    setStep({ kind: "enroll", factorId: enrolled.id, qr: enrolled.totp.qr_code, secret: enrolled.totp.secret });
  }

  useEffect(() => {
    // Deferred so the session lookup runs after mount, outside the effect body.
    queueMicrotask(() => void resolveStep());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onPassword(form: FormData) {
    setError(null);
    startTransition(async () => {
      const { error } = await supabase.auth.signInWithPassword({
        email: String(form.get("email") ?? "").trim(),
        password: String(form.get("password") ?? ""),
      });
      if (error) {
        setError("That email and password don't match.");
        return;
      }
      await resolveStep();
    });
  }

  function onCode(factorId: string, form: FormData) {
    setError(null);
    startTransition(async () => {
      const code = String(form.get("code") ?? "").replace(/\s/g, "");
      const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
      if (error) {
        setError("That code didn't work. Check the time on your phone and try the newest code.");
        return;
      }
      router.replace("/admin");
      router.refresh();
    });
  }

  async function startOver() {
    await supabase.auth.signOut();
    setError(null);
    setStep({ kind: "password" });
  }

  return (
    <main className={styles.loginPage}>
      <div className={styles.loginCard}>
        <Mark className={styles.loginMark} />
        <h1 className={styles.loginTitle}>Admin</h1>

        {error ? (
          <p className={styles.alertError} role="alert">
            {error}
          </p>
        ) : null}

        {step.kind === "loading" ? <p className={styles.muted}>Checking your session…</p> : null}

        {step.kind === "password" ? (
          <form action={onPassword} className={styles.stack}>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Email</span>
              <input className={styles.input} name="email" type="email" autoComplete="username" required />
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Password</span>
              <input
                className={styles.input}
                name="password"
                type="password"
                autoComplete="current-password"
                required
              />
            </label>
            <Button type="submit" block loading={pending}>
              Continue
            </Button>
          </form>
        ) : null}

        {step.kind === "enroll" ? (
          <form action={(f) => onCode(step.factorId, f)} className={styles.stack}>
            <p>
              Scan this with an authenticator app (Google Authenticator, 1Password, Authy), then enter the
              6-digit code it shows. You&apos;ll need the app every time you sign in.
            </p>
            {/* Supabase returns the QR code as an SVG data URL. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={step.qr} alt="Authenticator QR code" className={styles.qr} width={200} height={200} />
            <p className={styles.muted}>
              Can&apos;t scan? Enter this key: <code className={styles.code}>{step.secret}</code>
            </p>
            <CodeInput />
            <Button type="submit" block loading={pending}>
              Turn on and sign in
            </Button>
            <button type="button" className={styles.linkButton} onClick={startOver}>
              Use a different account
            </button>
          </form>
        ) : null}

        {step.kind === "verify" ? (
          <form action={(f) => onCode(step.factorId, f)} className={styles.stack}>
            <p>Enter the 6-digit code from your authenticator app.</p>
            <CodeInput />
            <Button type="submit" block loading={pending}>
              Sign in
            </Button>
            <button type="button" className={styles.linkButton} onClick={startOver}>
              Use a different account
            </button>
          </form>
        ) : null}
      </div>
    </main>
  );
}

function CodeInput() {
  return (
    <label className={styles.field}>
      <span className={styles.fieldLabel}>Code</span>
      <input
        className={`${styles.input} ${styles.codeInput}`}
        name="code"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9 ]{6,7}"
        maxLength={7}
        required
        autoFocus
      />
    </label>
  );
}
