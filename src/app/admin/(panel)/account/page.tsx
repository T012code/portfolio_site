import { requireAdminPage } from "@/lib/admin/auth";
import { AccessManager, PasswordForm, SessionTools } from "./AccountTools";
import styles from "../../admin.module.css";

const dateFormat = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "Africa/Lagos" });

export default async function AccountPage() {
  const { supabase, email } = await requireAdminPage();
  const [{ data: admins, error }, { data: factors }] = await Promise.all([
    supabase.rpc("admin_list"),
    supabase.auth.mfa.listFactors(),
  ]);
  const verified = (factors?.totp ?? []).filter((f) => f.status === "verified");

  return (
    <>
      <header className={styles.pageHead}>
        <div>
          <h1 className={styles.pageTitle}>Account &amp; access</h1>
          <p className={styles.pageIntro}>Your password, your sessions and who else can sign in to this dashboard.</p>
        </div>
      </header>

      <div className={styles.sections}>
        <div className={styles.split}>
          <section className={styles.card} aria-labelledby="password-heading">
            <div className={styles.cardHead}>
              <h2 id="password-heading" className={styles.cardTitle}>
                Password
              </h2>
            </div>
            <p className={styles.cardIntro}>
              Signed in as <strong>{email}</strong>. Use a long passphrase you don&apos;t use anywhere else; a password manager
              makes this painless.
            </p>
            <PasswordForm />
          </section>

          <section className={styles.card} aria-labelledby="security-heading">
            <div className={styles.cardHead}>
              <h2 id="security-heading" className={styles.cardTitle}>
                Sign-in security
              </h2>
              <span className={styles.tone} data-tone={verified.length ? "ok" : "warn"}>
                {verified.length ? "Two-step on" : "Two-step off"}
              </span>
            </div>
            <ul className={styles.checklist}>
              <li data-done>
                <span className={styles.checkMark}>✓</span>
                <span className={styles.checkText}>
                  Authenticator app required for every sign-in
                  {verified[0] ? ` (added ${dateFormat.format(new Date(verified[0].created_at))})` : ""}
                </span>
                <span />
              </li>
              <li data-done>
                <span className={styles.checkMark}>✓</span>
                <span className={styles.checkText}>Only addresses on the access list below can open the dashboard</span>
                <span />
              </li>
            </ul>
            <p className={styles.cardIntro}>
              Lost your phone? Remove the authenticator in Supabase → Authentication → Users, then sign in again to set up a new
              one.
            </p>
            <SessionTools />
          </section>
        </div>

        <section className={styles.card} aria-labelledby="access-heading">
          <div className={styles.cardHead}>
            <h2 id="access-heading" className={styles.cardTitle}>
              Who can sign in
            </h2>
          </div>
          <p className={styles.cardIntro}>
            Adding an address lets that person into the dashboard once they have an account (create it in Supabase →
            Authentication → Users → Add user). They set up their own authenticator on first sign-in. Removing an address
            locks them out straight away.
          </p>
          {error ? <p className={styles.alertError}>{error.message}</p> : null}
          <AccessManager admins={(admins ?? []).map((a) => ({ email: a.email, since: dateFormat.format(new Date(a.created_at)) }))} self={email} />
        </section>
      </div>
    </>
  );
}
