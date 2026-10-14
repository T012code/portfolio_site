import styles from "../../admin.module.css";

/** Whether Cloudflare Turnstile guards the contact forms (set by environment variable, not here). */
export function TurnstileStatus({ ready }: { ready: boolean }) {
  return (
    <section className={styles.card} aria-labelledby="turnstile-heading">
      <h2 id="turnstile-heading" className={styles.cardTitle}>
        Cloudflare Turnstile{" "}
        <span className={styles.tone} data-tone={ready ? "ok" : "warn"}>
          {ready ? "on" : "not set up"}
        </span>
      </h2>
      {ready ? (
        <p className={styles.muted}>
          Every enquiry and quick message must pass Cloudflare&apos;s human check. Most visitors never see it; anyone
          Cloudflare is unsure about gets a box to tick. Submissions without a valid check are refused.
        </p>
      ) : (
        <div className={styles.stack} style={{ gap: "var(--space-2)" }}>
          <p className={styles.muted}>
            The contact forms aren&apos;t checked by Cloudflare yet. To switch it on:
          </p>
          <ol className={styles.muted} style={{ paddingLeft: "1.25rem" }}>
            <li>In Cloudflare, open Turnstile and the widget used for the admin sign-in.</li>
            <li>Make sure layothedeveloper.com and www.layothedeveloper.com are in its hostnames.</li>
            <li>Copy its secret key.</li>
            <li>
              In Vercel, add an environment variable named <code>TURNSTILE_SECRET_KEY</code> with that value, then
              redeploy.
            </li>
          </ol>
        </div>
      )}
    </section>
  );
}
