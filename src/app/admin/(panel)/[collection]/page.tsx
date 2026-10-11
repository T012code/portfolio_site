import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/admin/auth";
import { getCollection } from "@/lib/admin/collections";
import { CollectionList, type ListItem } from "../CollectionList";
import styles from "../../admin.module.css";

export default async function CollectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ collection: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const [{ collection: key }, { saved }] = await Promise.all([params, searchParams]);
  const collection = getCollection(key);
  if (!collection) notFound();
  const { supabase } = await requireAdminPage();

  let query = supabase.from(collection.table as "projects").select("*");
  for (const o of collection.orderBy) query = query.order(o.column as "sort", { ascending: o.ascending });
  const { data, error } = await query;

  const items: ListItem[] = ((data ?? []) as unknown as Record<string, unknown>[]).map((row) => ({
    id: String(row.id),
    title: String(row[collection.titleField] ?? ""),
    subtitle: collection.subtitleField ? String(row[collection.subtitleField] ?? "") : undefined,
    published: typeof row.published === "boolean" ? row.published : undefined,
    featured: typeof row.featured === "boolean" ? row.featured : undefined,
  }));

  return (
    <>
      <header className={styles.pageHead}>
        <div>
          <h1 className={styles.pageTitle}>{collection.label}</h1>
          <p className={styles.pageIntro}>{collection.description}</p>
        </div>
        <Link href={`/admin/${collection.key}/new`} className={styles.smallButton}>
          Add {collection.singular}
        </Link>
      </header>
      {saved ? (
        <p className={styles.alertSuccess} role="status" style={{ marginBottom: "var(--space-6)" }}>
          Saved. The live site is updated.
        </p>
      ) : null}
      {error ? <p className={styles.alertError}>{error.message}</p> : null}
      <CollectionList
        // Remount when the server data changes so the local order resets.
        key={items.map((i) => i.id).join()}
        collection={collection.key}
        singular={collection.singular}
        items={items}
        sortable={collection.sortable}
        hasPublished={collection.hasPublished}
        hasFeatured={Boolean(collection.hasFeatured)}
      />
    </>
  );
}
