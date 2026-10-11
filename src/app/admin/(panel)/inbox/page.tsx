import Link from "next/link";
import { requireAdminPage } from "@/lib/admin/auth";
import { InboxItem, type InboxEntry } from "./InboxItem";
import styles from "../../admin.module.css";

const ENQUIRY_FILTERS = ["all", "new", "booked", "replied", "archived"] as const;
const MESSAGE_FILTERS = ["all", "new", "replied", "archived"] as const;

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; status?: string; q?: string }>;
}) {
  const params = await searchParams;
  const tab = params.tab === "messages" ? "messages" : "enquiries";
  const filters: readonly string[] = tab === "enquiries" ? ENQUIRY_FILTERS : MESSAGE_FILTERS;
  const status = params.status && filters.includes(params.status) ? params.status : "all";
  const search = (params.q ?? "").trim().slice(0, 100);
  const { supabase } = await requireAdminPage();

  let query = supabase.from(tab).select("*").order("created_at", { ascending: false }).limit(200);
  if (search) {
    // Search covers every status, archived included.
    const term = search.replace(/[%_,()\\]/g, " ").trim();
    if (term) query = query.or(`name.ilike.%${term}%,email.ilike.%${term}%,message.ilike.%${term}%`);
  } else if (status === "all") query = query.neq("status", "archived");
  else query = query.eq("status", status);
  const { data, error } = await query;

  // Emails already sent about each item (notification, autoreply, your replies).
  const ids = (data ?? []).map((r) => r.id);
  const { data: mail } = ids.length
    ? await supabase
        .from("mail_log")
        .select("ref_id, kind, status, created_at, subject, detail")
        .in("ref_id", ids)
        .order("created_at", { ascending: true })
    : { data: [] };
  const mailByItem = new Map<string, NonNullable<typeof mail>>();
  for (const m of mail ?? []) {
    if (!m.ref_id) continue;
    mailByItem.set(m.ref_id, [...(mailByItem.get(m.ref_id) ?? []), m]);
  }

  const href = (next: { tab?: string; status?: string }) => {
    const q = new URLSearchParams();
    q.set("tab", next.tab ?? tab);
    if (next.status && next.status !== "all") q.set("status", next.status);
    return `/admin/inbox?${q}`;
  };

  return (
    <>
      <header className={styles.pageHead}>
        <div>
          <h1 className={styles.pageTitle}>Inbox</h1>
          <p className={styles.pageIntro}>
            Enquiries become &ldquo;booked&rdquo; automatically when someone picks a call time on Cal.com.
          </p>
        </div>
      </header>

      <nav className={styles.tabs} aria-label="Inbox">
        <Link href={href({ tab: "enquiries" })} className={styles.tab} aria-current={tab === "enquiries" ? "page" : undefined}>
          Enquiries
        </Link>
        <Link href={href({ tab: "messages" })} className={styles.tab} aria-current={tab === "messages" ? "page" : undefined}>
          Messages
        </Link>
      </nav>

      <form className={styles.searchForm} role="search" action="/admin/inbox">
        <input type="hidden" name="tab" value={tab} />
        <label htmlFor="inbox-search" className="visually-hidden">
          Search {tab}
        </label>
        <input
          id="inbox-search"
          name="q"
          type="search"
          className={styles.input}
          defaultValue={search}
          placeholder="Search by name, email or message"
        />
        <button type="submit" className={styles.smallButton}>
          Search
        </button>
        {search ? (
          <Link href={href({})} className={styles.smallButton}>
            Clear
          </Link>
        ) : null}
      </form>

      <div className={styles.mediaButtons} style={{ marginBottom: "var(--space-6)" }} role="group" aria-label="Filter by status">
        {filters.map((f) => (
          <Link key={f} href={href({ status: f })} className={styles.pill} aria-pressed={!search && status === f}>
            {f === "all" ? "Open" : f}
          </Link>
        ))}
      </div>

      {error ? <p className={styles.alertError}>{error.message}</p> : null}
      {data && data.length === 0 ? (
        <p className={styles.empty}>{search ? `Nothing matches “${search}”.` : "Nothing here."}</p>
      ) : null}
      <ul className={styles.list}>
        {(data ?? []).map((row) => (
          <InboxItem key={row.id} kind={tab} entry={row as InboxEntry} mail={mailByItem.get(row.id) ?? []} />
        ))}
      </ul>
    </>
  );
}
