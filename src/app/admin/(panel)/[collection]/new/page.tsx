import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/admin/auth";
import { getCollection } from "@/lib/admin/collections";
import { emptyValue } from "@/lib/admin/fields";
import { saveCollectionItem } from "../../../actions";
import { EntityForm } from "../../EntityForm";
import styles from "../../../admin.module.css";

export default async function NewItemPage({ params }: { params: Promise<{ collection: string }> }) {
  const { collection: key } = await params;
  const collection = getCollection(key);
  if (!collection) notFound();
  await requireAdminPage();

  const values = Object.fromEntries(
    collection.fields.map((f) => [f.name, f.name === "published" ? true : emptyValue(f)]),
  );

  return (
    <>
      <header className={styles.pageHead}>
        <h1 className={styles.pageTitle}>New {collection.singular}</h1>
      </header>
      <EntityForm
        action={saveCollectionItem.bind(null, collection.key, null)}
        groups={[{ fields: collection.fields }]}
        values={values}
        submitLabel={`Create ${collection.singular}`}
        cancelHref={`/admin/${collection.key}`}
      />
    </>
  );
}
