import Link from "next/link";
import { requireAdminPage } from "@/lib/admin/auth";
import { InboxTable, type InboxRow, type MailEntry } from "./InboxTable";
import { statusLabel } from "./labels";
import styles from "../../admin.module.css";

const TYPES = ["all", "enquiries", "messages"] as const;
const STATUSES = ["open", "new", "booked", "replied", "archived"] as const;
const TYPE_LABEL: Record<string, string> = { all: "Everything", enquiries: "Enquiries", messages: "Quick messages" };

type Params = { type?: string; tab?: string; status?: string; q?: string };

export default async function InboxPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  // `tab` is the old parameter name; links from the email log still use it.
  const rawType = params.type ?? params.tab;
  const type = TYPES.find((t) => t === rawType) ?? "all";
  const status = STATUSES.find((s) => s === params.status) ?? "open";
  const search = (params.q ?? "").trim().slice(0, 100);
  const { supabase } = await requireAdminPage();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos" }).format(new Date());

  const load = async (table: "enquiries" | "messages") => {
    let query = supabase.from(table).select("*").order("created_at", { ascending: false }).limit(300);
    if (search) {
      // Search covers every status, archived included.
      const term = search.replace(/[%_,()\\]/g, " ").trim();
      if (term) query = query.or(`name.ilike.%${term}%,email.ilike.%${term}%,message.ilike.%${term}%`);
    } else if (status === "open") query = query.neq("status", "archived");
    else query = query.eq("status", status);
    const { data, error } = await query;
    return { rows: (data ?? []).map((r) => ({ ...r, kind: table }) as InboxRow), error };
  };

  const [enquiries, messages] = await Promise.all([
    type === "messages" ? null : load("enquiries"),
    // Only enquiries can be booked.
    type === "enquiries" || (status === "booked" && !search) ? null : load("messages"),
  ]);
  const rows = [...(enquiries?.rows ?? []), ...(messages?.rows ?? [])].sort((a, b) =>
    b.created_at.localeCompare(a.created_at),
  );
  const error = enquiries?.error ?? messages?.error;

  // Emails already sent about each item (notification, autoreply, your replies).
  const ids = rows.map((r) => r.id);
  const { data: mail } = ids.length
    ? await supabase
        .from("mail_log")
        .select("ref_id, kind, status, created_at, subject, detail")
        .in("ref_id", ids)
        .order("created_at", { ascending: true })
    : { data: [] };
  const mailByItem: Record<string, MailEntry[]> = {};
  for (const m of mail ?? []) {
    if (m.ref_id) (mailByItem[m.ref_id] ??= []).push(m);
  }

  const href = (next: { type?: string; status?: string }) => {
    const q = new URLSearchParams();
    const t = next.type ?? type;
    const s = next.status ?? status;
    if (t !== "all") q.set("type", t);
    if (s !== "open") q.set("status", s);
    const qs = q.toString();
    return qs ? `/admin/inbox?${qs}` : "/admin/inbox";
  };

  return (
    <>
      <header className={styles.pageHead}>
        <div>
          <h1 className={styles.pageTitle}>Inbox</h1>
          <p className={styles.pageIntro}>
            Enquiries and quick messages from the contact page. Enquiries become &ldquo;booked&rdquo; automatically when
            someone picks a call time.
          </p>
        </div>
      </header>

      <div className={styles.filterBar}>
        <div className={styles.mediaButtons} role="group" aria-label="Show">
          {TYPES.map((t) => (
            <Link key={t} href={href({ type: t })} className={styles.pill} aria-pressed={type === t}>
              {TYPE_LABEL[t]}
            </Link>
          ))}
        </div>
        <form className={styles.searchForm} role="search" action="/admin/inbox">
          {type !== "all" ? <input type="hidden" name="type" value={type} /> : null}
          <label htmlFor="inbox-search" className="visually-hidden">
            Search the inbox
          </label>
          <input
            id="inbox-search"
            name="q"
            type="search"
            className={styles.input}
            defaultValue={search}
            placeholder="Name, email or message"
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
      </div>

      {!search ? (
        <div className={styles.mediaButtons} style={{ marginBottom: "var(--space-5)" }} role="group" aria-label="Status">
          {STATUSES.filter((s) => s !== "booked" || type !== "messages").map((s) => (
            <Link key={s} href={href({ status: s })} className={styles.pill} aria-pressed={status === s}>
              {s === "open" ? "All open" : statusLabel(s)}
            </Link>
          ))}
        </div>
      ) : (
        <p className={styles.muted} style={{ marginBottom: "var(--space-5)" }}>
          Results for &ldquo;{search}&rdquo; across every status.
        </p>
      )}

      {error ? <p className={styles.alertError}>{error.message}</p> : null}
      {rows.length === 0 && !error ? (
        <p className={styles.empty}>{search ? `Nothing matches “${search}”.` : "Nothing here."}</p>
      ) : null}
      {rows.length > 0 ? <InboxTable rows={rows} mail={mailByItem} today={today} /> : null}
    </>
  );
}
