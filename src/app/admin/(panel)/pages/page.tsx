import Link from "next/link";
import { requireAdminPage } from "@/lib/admin/auth";
import type { Field } from "@/lib/admin/fields";
import { BLOCKS, resolveBlocks, type PageName } from "@/lib/blocks";
import { savePageBlock } from "../../actions";
import { EntityForm } from "../EntityForm";
import styles from "../../admin.module.css";

const PAGE_LABELS: Record<PageName, { label: string; href: string }> = {
  home: { label: "Home", href: "/" },
  about: { label: "About", href: "/about" },
  resume: { label: "Resume", href: "/resume" },
  work: { label: "Work", href: "/work" },
  contact: { label: "Contact", href: "/contact" },
  faq: { label: "FAQ", href: "/faq" },
  privacy: { label: "Privacy", href: "/privacy" },
  terms: { label: "Terms", href: "/terms" },
};

export default async function PageCopyPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page: requested } = await searchParams;
  const page: PageName = requested && Object.hasOwn(BLOCKS, requested) ? (requested as PageName) : "home";
  const { supabase } = await requireAdminPage();

  const { data } = await supabase.from("page_blocks").select("key, content").eq("page", page);
  const stored = Object.fromEntries((data ?? []).map((r) => [r.key, r.content]));
  const resolved = resolveBlocks(page, stored) as Record<string, Record<string, string | string[]>>;
  const defs = BLOCKS[page] as Record<string, { label: string; fields: readonly { name: string; label: string; kind: string; hint?: string }[] }>;

  return (
    <>
      <header className={styles.pageHead}>
        <div>
          <h1 className={styles.pageTitle}>Page copy</h1>
          <p className={styles.pageIntro}>
            Headings, intros and button labels. Lists like projects and services have their own sections.
          </p>
        </div>
        <Link href={PAGE_LABELS[page].href} target="_blank" className={styles.smallButton}>
          View {PAGE_LABELS[page].label} ↗
        </Link>
      </header>

      <nav className={styles.tabs} aria-label="Pages">
        {(Object.keys(BLOCKS) as PageName[]).map((p) => (
          <Link key={p} href={`/admin/pages?page=${p}`} className={styles.tab} aria-current={p === page ? "page" : undefined}>
            {PAGE_LABELS[p].label}
          </Link>
        ))}
      </nav>

      <div className={styles.stack} style={{ gap: "var(--space-16)" }}>
        {Object.entries(defs).map(([key, def]) => {
          const fields: Field[] = def.fields.map((f) => ({
            name: f.name,
            label: f.label,
            hint: f.hint ?? (f.kind === "paragraphs" ? "One paragraph per line." : undefined),
            kind: f.kind === "paragraphs" ? "lines" : f.kind === "document" ? "textarea" : (f.kind as Field["kind"]),
            rows: f.kind === "document" ? 28 : undefined,
          }));
          return (
            <section key={key} aria-label={def.label}>
              <EntityForm
                action={savePageBlock.bind(null, page, key)}
                groups={[{ group: def.label, fields }]}
                values={resolved[key]}
                submitLabel={`Save ${def.label.toLowerCase()}`}
              />
            </section>
          );
        })}
      </div>
    </>
  );
}
