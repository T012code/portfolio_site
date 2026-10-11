import Link from "next/link";
import { requireAdminPage } from "@/lib/admin/auth";
import styles from "../admin.module.css";

export default async function Dashboard() {
  const { supabase } = await requireAdminPage();
  const count = (q: PromiseLike<{ count: number | null }>) => q.then((r) => r.count ?? 0);

  const [newEnquiries, booked, newMessages, projects, drafts] = await Promise.all([
    count(supabase.from("enquiries").select("id", { count: "exact", head: true }).eq("status", "new")),
    count(supabase.from("enquiries").select("id", { count: "exact", head: true }).eq("status", "booked")),
    count(supabase.from("messages").select("id", { count: "exact", head: true }).eq("status", "new")),
    count(supabase.from("projects").select("id", { count: "exact", head: true }).eq("published", true)),
    count(supabase.from("projects").select("id", { count: "exact", head: true }).eq("published", false)),
  ]);

  const stats = [
    { label: "New enquiries", value: newEnquiries, href: "/admin/inbox" },
    { label: "Calls booked", value: booked, href: "/admin/inbox?status=booked" },
    { label: "New messages", value: newMessages, href: "/admin/inbox?tab=messages" },
    { label: "Live projects", value: projects, href: "/admin/projects" },
    { label: "Draft projects", value: drafts, href: "/admin/projects" },
  ];

  return (
    <>
      <header className={styles.pageHead}>
        <div>
          <h1 className={styles.pageTitle}>Dashboard</h1>
          <p className={styles.pageIntro}>Changes you save here go live within seconds.</p>
        </div>
      </header>

      <ul className={styles.stats}>
        {stats.map((s) => (
          <li key={s.label}>
            <Link href={s.href} className={styles.stat}>
              <span className="label">{s.label}</span>
              <span className={styles.statValue}>{s.value}</span>
            </Link>
          </li>
        ))}
      </ul>

      <h2 className="label">Quick links</h2>
      <ul className={styles.list} style={{ marginTop: "var(--space-3)" }}>
        {[
          { href: "/admin/projects/new", label: "Add a project" },
          { href: "/admin/pages", label: "Edit page copy" },
          { href: "/admin/media", label: "Upload images" },
          { href: "/admin/settings", label: "Update contact details, CV and SEO" },
        ].map((l) => (
          <li key={l.href} className={styles.row} style={{ gridTemplateColumns: "1fr" }}>
            <Link href={l.href} className={styles.rowTitle}>
              {l.label} →
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
