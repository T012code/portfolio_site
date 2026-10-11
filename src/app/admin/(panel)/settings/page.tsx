import { requireAdminPage } from "@/lib/admin/auth";
import { SETTINGS_FIELDS } from "@/lib/admin/collections";
import type { FieldValue } from "@/lib/admin/fields";
import { saveSettings } from "../../actions";
import { EntityForm } from "../EntityForm";
import styles from "../../admin.module.css";

export default async function SettingsPage() {
  const { supabase } = await requireAdminPage();
  const { data, error } = await supabase.from("site_settings").select("*").eq("id", true).single();

  return (
    <>
      <header className={styles.pageHead}>
        <div>
          <h1 className={styles.pageTitle}>Settings</h1>
          <p className={styles.pageIntro}>Contact details, portrait, CV, search listing and enquiry form options.</p>
        </div>
      </header>
      {error ? <p className={styles.alertError}>{error.message}</p> : null}
      {data ? (
        <EntityForm
          action={saveSettings}
          groups={SETTINGS_FIELDS}
          values={data as unknown as Record<string, FieldValue>}
          submitLabel="Save settings"
        />
      ) : null}
    </>
  );
}
