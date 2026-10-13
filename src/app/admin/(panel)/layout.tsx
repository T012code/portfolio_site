import Link from "next/link";
import { Suspense } from "react";
import { Mark } from "@/components/brand/Mark";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Icon, type IconName } from "@/components/ui/Icon";
import { requireAdminPage } from "@/lib/admin/auth";
import { COLLECTIONS, type CollectionKey } from "@/lib/admin/collections";
import { getNewInboxCounts } from "@/lib/admin/inbox";
import { signOut } from "../actions";
import { AdminNav, SidebarFrame } from "./AdminNav";
import styles from "../admin.module.css";

export const instant = false;

const COLLECTION_ICONS: Record<CollectionKey, IconName> = {
  projects: "image",
  services: "layers",
  capabilities: "layers",
  process: "layers",
  experience: "file-text",
  skills: "layers",
  faqs: "message-circle",
};

async function Shell({ children }: { children: React.ReactNode }) {
  const { email } = await requireAdminPage();
  const counts = await getNewInboxCounts();
  const newCount = counts.enquiries + counts.messages;

  const groups = [
    {
      heading: "Overview",
      items: [
        { href: "/admin", label: "Dashboard", icon: "dashboard" as const },
        { href: "/admin/inbox", label: "Inbox", icon: "inbox" as const, badge: newCount },
      ],
    },
    {
      heading: "Content",
      items: [
        { href: "/admin/pages", label: "Page copy", icon: "file-text" as const },
        ...Object.values(COLLECTIONS).map((c) => ({ href: `/admin/${c.key}`, label: c.label, icon: COLLECTION_ICONS[c.key] })),
        { href: "/admin/media", label: "Media", icon: "image" as const },
      ],
    },
    {
      heading: "System",
      items: [
        { href: "/admin/email", label: "Email", icon: "mail" as const },
        { href: "/admin/whatsapp", label: "WhatsApp", icon: "message-circle" as const },
        { href: "/admin/spam", label: "Spam protection", icon: "shield" as const },
        { href: "/admin/settings", label: "Site settings", icon: "settings" as const },
        { href: "/admin/account", label: "Account & access", icon: "user" as const },
      ],
    },
  ];

  const brand = (
    <Link href="/admin" className={styles.brand}>
      <Mark /> Admin
    </Link>
  );

  return (
    <div className={styles.shell}>
      <SidebarFrame brand={brand}>
        <AdminNav groups={groups} />
        <div className={styles.sidebarFoot}>
          <Link href="/" target="_blank" className={styles.navLink}>
            <Icon name="external" size={16} className={styles.navIcon} />
            <span className={styles.navText}>View site</span>
          </Link>
          <div className={styles.footRow}>
            <ThemeToggle />
            <form action={signOut}>
              <button type="submit" className={styles.linkButton}>
                Sign out
              </button>
            </form>
          </div>
          <p className={styles.muted} title={email} style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
            {email}
          </p>
        </div>
      </SidebarFrame>
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
