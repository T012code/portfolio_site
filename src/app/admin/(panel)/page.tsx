import Link from "next/link";
import { Icon, type IconName } from "@/components/ui/Icon";
import { requireAdminPage } from "@/lib/admin/auth";
import { daysAgo, getNewInboxCounts } from "@/lib/admin/inbox";
import { getMailHealth } from "@/lib/mail/status";
import styles from "../admin.module.css";

const timeFormat = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Lagos" });
const dayFormat = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "Africa/Lagos" });

function greeting() {
  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone: "Africa/Lagos" }).format(new Date()));
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}

export default async function Dashboard() {
  const session = await requireAdminPage();
  const { supabase } = session;
  const count = (q: PromiseLike<{ count: number | null }>) => q.then((r) => r.count ?? 0);
  const weekAgo = daysAgo(7);

  const [inbox, booked, projects, drafts, health, settings, templates, recentEnquiries, recentMessages, mail, failed, traffic] =
    await Promise.all([
      getNewInboxCounts(),
      count(supabase.from("enquiries").select("id", { count: "exact", head: true }).eq("status", "booked")),
      count(supabase.from("projects").select("id", { count: "exact", head: true }).eq("published", true)),
      count(supabase.from("projects").select("id", { count: "exact", head: true }).eq("published", false)),
      getMailHealth(session),
      supabase.from("site_settings").select("email, cv_path, portrait_path, cal_link").eq("id", true).single(),
      supabase.from("mail_templates").select("enabled"),
      supabase.from("enquiries").select("id, name, service, status, created_at").neq("status", "archived").order("created_at", { ascending: false }).limit(5),
      supabase.from("messages").select("id, name, status, created_at").neq("status", "archived").order("created_at", { ascending: false }).limit(5),
      supabase.from("mail_log").select("id, kind, to_email, status, created_at, subject").order("created_at", { ascending: false }).limit(6),
      count(supabase.from("mail_log").select("id", { count: "exact", head: true }).eq("status", "failed").gte("created_at", weekAgo)),
      supabase.rpc("analytics_summary", { p_days: 30 }),
    ]);
  const reach = (traffic.data as { reach?: { month: number; live: number } } | null)?.reach;

  const recent = [
    ...(recentEnquiries.data ?? []).map((e) => ({ ...e, kind: "Enquiry", detail: e.service, tab: "enquiries" })),
    ...(recentMessages.data ?? []).map((m) => ({ ...m, kind: "Message", detail: "", tab: "messages" })),
  ]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 6);

  const s = settings.data;
  const autoreplies = (templates.data ?? []).filter((t) => t.enabled).length;
  const checklist: { done: boolean; label: string; href: string; action: string }[] = [
    {
      done: health.ready,
      label: health.ready ? "Email sending is on and configured" : `Set up email sending${health.problem ? `: ${health.problem}` : ""}`,
      href: "/admin/email",
      action: "Email setup",
    },
    {
      done: autoreplies > 0,
      label: autoreplies > 0 ? `Automatic replies on (${autoreplies} of 2)` : "Turn on automatic replies to visitors",
      href: "/admin/email?tab=autoresponders",
      action: "Autoresponders",
    },
    {
      done: Boolean(s?.email?.endsWith("@layothedeveloper.com")),
      label: "Public email address on your own domain",
      href: "/admin/settings",
      action: "Settings",
    },
    { done: Boolean(s?.cv_path), label: "CV uploaded for the Resume page", href: "/admin/settings", action: "Settings" },
    { done: Boolean(s?.portrait_path), label: "Portrait photo set", href: "/admin/settings", action: "Settings" },
    { done: Boolean(s?.cal_link), label: "Cal.com booking link set", href: "/admin/settings", action: "Settings" },
  ];
  const done = checklist.filter((c) => c.done).length;

  const stats: { label: string; value: number; href: string; icon: IconName; note?: string; alert?: boolean }[] = [
    {
      label: "Visitors, 30 days",
      value: reach?.month ?? 0,
      href: "/admin/analytics",
      icon: "chart",
      note: reach?.live ? `${reach.live} on the site now` : undefined,
    },
    { label: "New enquiries", value: inbox.enquiries, href: "/admin/inbox", icon: "inbox" },
    { label: "New messages", value: inbox.messages, href: "/admin/inbox?tab=messages", icon: "message-circle" },
    { label: "Calls booked", value: booked, href: "/admin/inbox?status=booked", icon: "calendar" },
    { label: "Live projects", value: projects, href: "/admin/projects", icon: "image", note: drafts ? `${drafts} in draft` : undefined },
    { label: "Failed emails, 7 days", value: failed, href: "/admin/email?tab=log&status=failed", icon: "alert", alert: failed > 0 },
  ];

  const quick: { href: string; label: string; icon: IconName }[] = [
    { href: "/admin/projects/new", label: "Add a project", icon: "plus" },
    { href: "/admin/pages", label: "Edit page copy", icon: "file-text" },
    { href: "/admin/media", label: "Upload images", icon: "image" },
    { href: "/admin/email?tab=autoresponders", label: "Edit automatic replies", icon: "send" },
    { href: "/admin/settings", label: "Contact details and SEO", icon: "settings" },
    { href: "/admin/account", label: "Password and access", icon: "shield" },
  ];

  const tone = (status: string) => (status === "sent" ? "ok" : status === "failed" ? "error" : status === "skipped" ? "warn" : "neutral");

  return (
    <>
      <header className={styles.pageHead}>
        <div>
          <p className="label">{dayFormat.format(new Date())}</p>
          <h1 className={styles.pageTitle} style={{ marginTop: "var(--space-2)" }}>
            {greeting()}
          </h1>
          <p className={styles.pageIntro}>
            {inbox.enquiries + inbox.messages > 0
              ? `You have ${inbox.enquiries + inbox.messages} new ${inbox.enquiries + inbox.messages === 1 ? "item" : "items"} in the inbox.`
              : "Inbox is clear."}{" "}
            Changes you save here go live within seconds.
          </p>
        </div>
        <Link href="/" target="_blank" className={styles.smallButton}>
          View site <Icon name="external" size={14} />
        </Link>
      </header>

      <div className={styles.sections}>
        <ul className={styles.kpis}>
          {stats.map((stat) => (
            <li key={stat.label} style={{ display: "grid" }}>
              <Link href={stat.href} className={styles.kpi}>
                <span className="label" style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                  <Icon name={stat.icon} size={14} /> {stat.label}
                </span>
                <span className={styles.kpiValue} style={stat.alert ? { color: "var(--color-danger)" } : undefined}>
                  {stat.value}
                </span>
                {stat.note ? <span className={styles.kpiNote}>{stat.note}</span> : null}
              </Link>
            </li>
          ))}
        </ul>

        <div className={styles.split}>
          <section className={styles.card} aria-labelledby="recent-heading">
            <div className={styles.cardHead}>
              <h2 id="recent-heading" className={styles.cardTitle}>
                Latest in the inbox
              </h2>
              <Link href="/admin/inbox" className={styles.muted}>
                Open inbox →
              </Link>
            </div>
            {recent.length === 0 ? <p className={styles.muted}>Nothing yet. Enquiries and messages from the site land here.</p> : null}
            <ul className={styles.activity}>
              {recent.map((item) => (
                <li key={item.id}>
                  <span>
                    <Link href={`/admin/inbox?tab=${item.tab}&q=${encodeURIComponent(item.name)}`}>{item.name}</Link>
                    <span className={styles.muted}>
                      {" "}
                      · {item.kind}
                      {item.detail ? `: ${item.detail}` : ""}
                    </span>
                  </span>
                  <span className={styles.tone} data-tone={item.status === "new" ? "warn" : "neutral"}>
                    {item.status}
                  </span>
                  <span className={styles.kpiNote}>{timeFormat.format(new Date(item.created_at))}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className={styles.card} aria-labelledby="setup-heading">
            <div className={styles.cardHead}>
              <h2 id="setup-heading" className={styles.cardTitle}>
                Launch checklist
              </h2>
              <span className={styles.muted}>
                {done} of {checklist.length} done
              </span>
            </div>
            <div className={styles.progress} aria-hidden="true">
              <span style={{ transform: `scaleX(${done / checklist.length})` }} />
            </div>
            <ul className={styles.checklist}>
              {checklist.map((c) => (
                <li key={c.label} data-done={c.done || undefined}>
                  <span className={styles.checkMark}>{c.done ? <Icon name="check" size={14} /> : null}</span>
                  <span className={styles.checkText}>
                    <span className="visually-hidden">{c.done ? "Done: " : "To do: "}</span>
                    {c.label}
                  </span>
                  {c.done ? <span /> : (
                    <Link href={c.href} className={styles.muted}>
                      {c.action} →
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className={styles.split}>
          <section className={styles.card} aria-labelledby="mail-heading">
            <div className={styles.cardHead}>
              <h2 id="mail-heading" className={styles.cardTitle}>
                Email activity
              </h2>
              <Link href="/admin/email?tab=log" className={styles.muted}>
                Full log →
              </Link>
            </div>
            {(mail.data ?? []).length === 0 ? (
              <p className={styles.muted}>No emails sent yet. Once SMTP is set up, every send shows here.</p>
            ) : null}
            <ul className={styles.activity}>
              {(mail.data ?? []).map((m) => (
                <li key={m.id}>
                  <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={m.subject}>
                    {m.subject || "(no subject)"}
                    <span className={styles.muted}> · {m.to_email}</span>
                  </span>
                  <span className={styles.tone} data-tone={tone(m.status)}>
                    {m.status}
                  </span>
                  <span className={styles.kpiNote}>{timeFormat.format(new Date(m.created_at))}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className={styles.card} aria-labelledby="quick-heading">
            <div className={styles.cardHead}>
              <h2 id="quick-heading" className={styles.cardTitle}>
                Quick actions
              </h2>
            </div>
            <ul className={styles.quickGrid}>
              {quick.map((q) => (
                <li key={q.href}>
                  <Link href={q.href} className={styles.quickLink}>
                    <span className={styles.quickIcon}>
                      <Icon name={q.icon} size={16} />
                    </span>
                    {q.label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </>
  );
}
