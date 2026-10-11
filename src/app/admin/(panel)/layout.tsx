import Link from "next/link";
import { Suspense } from "react";
import { Mark } from "@/components/brand/Mark";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { requireAdminPage } from "@/lib/admin/auth";
import { COLLECTIONS } from "@/lib/admin/collections";
import { signOut } from "../actions";
import { AdminNav } from "./AdminNav";
import styles from "../admin.module.css";

export const instant = false;

async function Shell({ children }: { children: React.ReactNode }) {
  const { email, supabase } = await requireAdminPage();
  const [enquiries, messages] = await Promise.all([
    supabase.from("enquiries").select("id", { count: "exact", head: true }).eq("status", "new"),
    supabase.from("messages").select("id", { count: "exact", head: true }).eq("status", "new"),
  ]);
  const newCount = (enquiries.count ?? 0) + (messages.count ?? 0);

  const groups = [
    {
      heading: "Overview",
      items: [
        { href: "/admin", label: "Dashboard" },
        { href: "/admin/inbox", label: "Inbox", badge: newCount },
      ],
    },
    {
      heading: "Content",
      items: [
        { href: "/admin/pages", label: "Page copy" },
        ...Object.values(COLLECTIONS).map((c) => ({ href: `/admin/${c.key}`, label: c.label })),
      ],
    },
    {
      heading: "Site",
      items: [
        { href: "/admin/media", label: "Media" },
        { href: "/admin/settings", label: "Settings" },
      ],
    },
  ];

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <Link href="/admin" className={styles.brand}>
          <Mark /> Admin
        </Link>
        <AdminNav groups={groups} />
        <div className={styles.sidebarFoot}>
          <Link href="/" target="_blank" className={styles.navLink}>
            View site ↗
          </Link>
          <ThemeToggle />
          <form action={signOut}>
            <button type="submit" className={styles.linkButton}>
              Sign out
            </button>
          </form>
          <p className={styles.muted} title={email}>
            {email}
          </p>
        </div>
      </aside>
      <main className={styles.main} id="main">
        {children}
      </main>
    </div>
  );
}

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<p className={styles.main}>Loading…</p>}>
      <Shell>{children}</Shell>
    </Suspense>
  );
}
