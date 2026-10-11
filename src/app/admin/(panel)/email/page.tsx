import Link from "next/link";
import { requireAdminPage } from "@/lib/admin/auth";
import { daysAgo } from "@/lib/admin/inbox";
import { getMailHealth } from "@/lib/mail/status";
import { TEMPLATE_KEYS } from "@/lib/mail/templates";
import { getSettings } from "@/lib/content";
import { SITE_URL } from "@/lib/env";
import { Deliverability } from "./Deliverability";
import { MailSettingsForm } from "./MailSettingsForm";
import { TemplateEditor } from "./TemplateEditor";
import styles from "../../admin.module.css";

const TABS = [
  { key: "setup", label: "Setup" },
  { key: "autoresponders", label: "Autoresponders" },
  { key: "log", label: "Delivery log" },
] as const;

const LOG_STATUSES = ["all", "sent", "failed", "skipped"] as const;
const KIND_LABELS: Record<string, string> = {
  notification: "Notification",
  autoreply: "Autoreply",
  reply: "Reply",
  test: "Test",
};
const PAGE_SIZE = 50;

const dateFormat = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Lagos" });

export default async function EmailPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; status?: string; page?: string }>;
}) {
  const params = await searchParams;
  const tab = TABS.some((t) => t.key === params.tab) ? params.tab! : "setup";
  const session = await requireAdminPage();
  const { supabase, email: adminEmail } = session;

  const [health, settingsRes, templatesRes, stats] = await Promise.all([
    getMailHealth(session),
    supabase.from("mail_settings").select("*").eq("id", true).single(),
    supabase.from("mail_templates").select("*"),
    supabase
      .from("mail_log")
      .select("status")
      .gte("created_at", daysAgo(7))
      .limit(5000),
  ]);
  const settings = settingsRes.data;
  const counts = { sent: 0, failed: 0, skipped: 0 };
  for (const row of stats.data ?? []) {
    if (row.status in counts) counts[row.status as keyof typeof counts] += 1;
  }

  const sendingTone = health.ready ? "ok" : health.enabled ? "error" : "neutral";
  const sendingLabel = health.ready ? "Sending" : health.enabled ? "Needs attention" : "Off";

  return (
    <>
      <header className={styles.pageHead}>
        <div>
          <h1 className={styles.pageTitle}>Email</h1>
          <p className={styles.pageIntro}>
            How the site sends mail through your own mailbox (Zoho or Gmail): new-enquiry notifications, automatic replies to visitors, and
            replies you write from the inbox.
          </p>
        </div>
        <span className={styles.tone} data-tone={sendingTone}>
          {sendingLabel}
        </span>
      </header>

      <ul className={styles.kpis} style={{ marginBottom: "var(--space-8)" }}>
        <li className={styles.kpi}>
          <span className="label">Status</span>
          <span className={styles.kpiValue} style={{ fontSize: "var(--text-h3)" }}>
            {sendingLabel}
          </span>
          <span className={styles.kpiNote}>{health.problem ?? (health.enabled ? "SMTP configured" : "Switch on under Setup")}</span>
        </li>
        <li className={styles.kpi}>
          <span className="label">Sent, 7 days</span>
          <span className={styles.kpiValue}>{counts.sent}</span>
        </li>
        <li className={styles.kpi}>
          <span className="label">Failed, 7 days</span>
          <span className={styles.kpiValue} style={counts.failed ? { color: "var(--color-danger)" } : undefined}>
            {counts.failed}
          </span>
        </li>
        <li className={styles.kpi}>
          <span className="label">Skipped, 7 days</span>
          <span className={styles.kpiValue}>{counts.skipped}</span>
          <span className={styles.kpiNote}>Limits and switched-off sending</span>
        </li>
      </ul>

      <nav className={styles.tabs} aria-label="Email sections">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/admin/email?tab=${t.key}`}
            className={styles.tab}
            aria-current={tab === t.key ? "page" : undefined}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {settingsRes.error ? <p className={styles.alertError}>{settingsRes.error.message}</p> : null}

      {tab === "setup" && settings ? (
        <div className={styles.sections}>
          {!health.secretConfigured ? (
            <p className={styles.alertError} role="alert">
              The server key MAIL_SECRET is missing, so the SMTP password can&apos;t be stored. Add it in Vercel → Settings →
              Environment Variables and redeploy.
            </p>
          ) : null}
          <MailSettingsForm settings={settings} passwordSet={health.passwordSet && !health.passwordUnreadable} adminEmail={adminEmail} />
          <Deliverability fromEmail={settings.from_email} />
        </div>
      ) : null}

      {tab === "autoresponders" ? <Autoresponders templates={templatesRes.data ?? []} adminEmail={adminEmail} /> : null}

      {tab === "log" ? <MailLog status={params.status} page={params.page} /> : null}
    </>
  );
}

async function Autoresponders({
  templates,
  adminEmail,
}: {
  templates: { key: string; label: string; enabled: boolean; format: string; subject: string; body: string }[];
  adminEmail: string;
}) {
  const site = await getSettings();
  const ordered = TEMPLATE_KEYS.map((k) => templates.find((t) => t.key === k)).filter(Boolean) as typeof templates;
  return (
    <div className={styles.sections}>
      <p className={styles.cardIntro} style={{ marginTop: "calc(-1 * var(--space-4))" }}>
        Sent once to each visitor straight after they use the contact form. To stop the form being used to send mail at volume,
        each address gets at most one automatic reply a day and the site sends at most 30 an hour. Visitor names are cleaned of
        links before they go into an email.
      </p>
      {ordered.map((t) => (
        <TemplateEditor
          key={t.key}
          template={t}
          adminEmail={adminEmail}
          brand={site.display_name}
          footer={site.motto}
          siteUrl={SITE_URL}
        />
      ))}
    </div>
  );
}

async function MailLog({ status, page }: { status?: string; page?: string }) {
  const { supabase } = await requireAdminPage();
  const filter = LOG_STATUSES.includes(status as (typeof LOG_STATUSES)[number]) ? status! : "all";
  const pageNumber = Math.max(1, Math.min(200, Number(page) || 1));
  let query = supabase
    .from("mail_log")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((pageNumber - 1) * PAGE_SIZE, pageNumber * PAGE_SIZE - 1);
  if (filter !== "all") query = query.eq("status", filter);
  const { data, count, error } = await query;
  const pages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  const href = (next: { status?: string; page?: number }) => {
    const q = new URLSearchParams({ tab: "log" });
    const s = next.status ?? filter;
    if (s !== "all") q.set("status", s);
    if (next.page && next.page > 1) q.set("page", String(next.page));
    return `/admin/email?${q}`;
  };
  const tone = (s: string) => (s === "sent" ? "ok" : s === "failed" ? "error" : s === "skipped" ? "warn" : "neutral");

  return (
    <div className={styles.stack}>
      <div className={styles.mediaButtons} role="group" aria-label="Filter by status">
        {LOG_STATUSES.map((s) => (
          <Link key={s} href={href({ status: s, page: 1 })} className={styles.pill} aria-pressed={filter === s}>
            {s}
          </Link>
        ))}
      </div>
      {error ? <p className={styles.alertError}>{error.message}</p> : null}
      {data && data.length === 0 ? (
        <p className={styles.empty}>No emails yet. Every email the site sends, or decides not to send, shows up here.</p>
      ) : null}
      {data && data.length > 0 ? (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">When</th>
                <th scope="col">Type</th>
                <th scope="col">To</th>
                <th scope="col">Subject</th>
                <th scope="col">Result</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.id}>
                  <td className={styles.nowrap}>{dateFormat.format(new Date(row.created_at))}</td>
                  <td className={styles.nowrap}>
                    {KIND_LABELS[row.kind] ?? row.kind}
                    {row.ref_id ? (
                      <>
                        {" "}
                        <Link href={`/admin/inbox?tab=${row.ref_type === "message" ? "messages" : "enquiries"}&q=${encodeURIComponent(row.to_email)}`} className={styles.muted}>
                          (view)
                        </Link>
                      </>
                    ) : null}
                  </td>
                  <td className={styles.clip} title={row.to_email}>
                    {row.to_email}
                  </td>
                  <td className={styles.clip} title={row.subject}>
                    {row.subject}
                  </td>
                  <td>
                    <span className={styles.tone} data-tone={tone(row.status)}>
                      {row.status}
                    </span>
                    {row.detail ? <p className={styles.muted} style={{ marginTop: "var(--space-1)", maxWidth: "36ch" }}>{row.detail}</p> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {pages > 1 ? (
        <nav className={styles.inline} aria-label="Pages">
          {pageNumber > 1 ? (
            <Link href={href({ page: pageNumber - 1 })} className={styles.smallButton}>
              Newer
            </Link>
          ) : null}
          <span className={styles.muted}>
            Page {pageNumber} of {pages}
          </span>
          {pageNumber < pages ? (
            <Link href={href({ page: pageNumber + 1 })} className={styles.smallButton}>
              Older
            </Link>
          ) : null}
        </nav>
      ) : null}
    </div>
  );
}
