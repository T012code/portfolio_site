import { requireAdminPage } from "@/lib/admin/auth";
import { MediaLibrary } from "./MediaLibrary";
import styles from "../../admin.module.css";

export default async function MediaPage() {
  const { supabase } = await requireAdminPage();
  const { data, error } = await supabase.from("media").select("*").order("created_at", { ascending: false });

  return (
    <>
      <header className={styles.pageHead}>
        <div>
          <h1 className={styles.pageTitle}>Media</h1>
          <p className={styles.pageIntro}>
            Images and PDFs up to 10 MB. Files in use on the site can&apos;t be deleted until they&apos;re replaced.
          </p>
        </div>
      </header>
      {error ? <p className={styles.alertError}>{error.message}</p> : null}
      <MediaLibrary initial={data ?? []} />
    </>
  );
}
