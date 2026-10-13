import { requireAdminPage } from "@/lib/admin/auth";
import { mailSecretConfigured } from "@/lib/mail/secret";
import { turnstileReady } from "@/lib/turnstile";
import { SpamForm } from "./SpamForm";
import { TurnstileStatus } from "./TurnstileStatus";
import styles from "../../admin.module.css";

export default async function SpamPage() {
  const { supabase } = await requireAdminPage();
  const [{ data: settings }, { data: secretSet }] = await Promise.all([
    supabase.from("site_settings").select("recaptcha_enabled, recaptcha_site_key, recaptcha_min_score").eq("id", true).single(),
    supabase.rpc("recaptcha_secret_set"),
  ]);
  const recaptchaOn = Boolean(settings?.recaptcha_enabled && settings.recaptcha_site_key && secretSet);
  const on = turnstileReady() || recaptchaOn;

  return (
    <>
      <header className={styles.pageHead}>
        <div>
          <h1 className={styles.pageTitle}>Spam protection</h1>
          <p className={styles.pageIntro}>
            Every contact form has a hidden trap field, a minimum fill time and hourly limits. Cloudflare Turnstile
            adds a human check on top; Google reCAPTCHA is an optional second layer.
          </p>
        </div>
        <span className={styles.tone} data-tone={on ? "ok" : "neutral"}>
          {on ? "On" : "Off"}
        </span>
      </header>

      <div className={styles.sections}>
        <TurnstileStatus ready={turnstileReady()} />
        {!mailSecretConfigured() ? (
          <p className={styles.alertError} role="alert">
            The server key MAIL_SECRET is missing, so the reCAPTCHA secret can&apos;t be stored. Add it in Vercel and redeploy.
          </p>
        ) : null}

        <div className={styles.split}>
          <SpamForm
            enabled={settings?.recaptcha_enabled ?? false}
            siteKey={settings?.recaptcha_site_key ?? ""}
            minScore={settings?.recaptcha_min_score ?? 0.5}
            secretSet={Boolean(secretSet)}
          />

          <section className={styles.card} aria-labelledby="keys-heading">
            <h2 id="keys-heading" className={styles.cardTitle}>
              Getting your keys
            </h2>
            <ol className={styles.stack} style={{ gap: "var(--space-3)", paddingLeft: "1.25rem", fontSize: "var(--text-small)" }}>
              <li>
                Open the{" "}
                <a href="https://www.google.com/recaptcha/admin/create" target="_blank" rel="noopener">
                  reCAPTCHA admin console
                </a>{" "}
                and sign in with your Google account.
              </li>
              <li>Label: Layò website. Type: <strong>Score based (v3)</strong>.</li>
              <li>
                Domains: <code>layothedeveloper.com</code> and <code>layothedeveloper.vercel.app</code> (subdomains such as www are
                covered automatically).
              </li>
              <li>Submit, then copy the <strong>site key</strong> and <strong>secret key</strong> into the form here.</li>
              <li>Save with protection off, click <strong>Check secret key</strong>, then switch it on.</li>
            </ol>
            <p className={styles.cardIntro}>
              Every visitor gets a score from 0 (bot) to 1 (person). Balanced blocks anything under 0.5, which suits most sites.
              If a real person is ever blocked, they see a message asking them to try again or email you, and you can lower the
              strictness.
            </p>
          </section>
        </div>
      </div>
    </>
  );
}
