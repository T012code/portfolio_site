import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/admin/auth";
import { getCollection } from "@/lib/admin/collections";
import type { FieldValue } from "@/lib/admin/fields";
import { saveCollectionItem } from "../../../actions";
import { EntityForm } from "../../EntityForm";
import styles from "../../../admin.module.css";

export default async function EditItemPage({ params }: { params: Promise<{ collection: string; id: string }> }) {
  const { collection: key, id } = await params;
  const collection = getCollection(key);
  if (!collection || !/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { supabase } = await requireAdminPage();

  const { data } = await supabase.from(collection.table as "projects").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const row = data as unknown as Record<string, FieldValue>;

  return (
    <>
      <header className={styles.pageHead}>
        <div>
          <p className="label">{collection.label}</p>
          <h1 className={styles.pageTitle}>{String(row[collection.titleField] ?? "")}</h1>
        </div>
      </header>
      <EntityForm
        action={saveCollectionItem.bind(null, collection.key, id)}
        groups={[{ fields: collection.fields }]}
        values={row}
        submitLabel="Save changes"
        cancelHref={`/admin/${collection.key}`}
      />
    </>
  );
}
