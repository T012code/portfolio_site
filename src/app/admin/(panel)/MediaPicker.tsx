"use client";

import { useEffect, useRef, useState } from "react";
import type { Row } from "@/lib/supabase/database.types";
import { getBrowserClient } from "@/lib/supabase/browser";
import { mediaUrl } from "@/lib/media";
import styles from "../admin.module.css";

type Media = Row<"media">;

export function MediaPicker({
  open,
  onClose,
  onPick,
  accept,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (media: Media) => void;
  accept: "image" | "pdf";
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [items, setItems] = useState<Media[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const query = getBrowserClient().from("media").select("*").order("created_at", { ascending: false }).limit(200);
    (accept === "pdf" ? query.eq("mime", "application/pdf") : query.like("mime", "image/%")).then(({ data, error }) => {
      if (cancelled) return;
      if (error) setError(error.message);
      else setItems(data);
    });
    return () => {
      cancelled = true;
    };
  }, [open, accept]);

  return (
    <dialog ref={ref} className={styles.dialog} onClose={onClose} aria-labelledby="picker-title">
      <div className={styles.dialogHead}>
        <h2 id="picker-title" className="label">
          Choose from library
        </h2>
        <button type="button" className={styles.smallButton} onClick={onClose}>
          Close
        </button>
      </div>
      <div className={styles.dialogBody}>
        {error ? <p className={styles.alertError}>{error}</p> : null}
        {items === null && !error ? <p className={styles.muted}>Loading…</p> : null}
        {items?.length === 0 ? <p className={styles.empty}>Nothing uploaded yet.</p> : null}
        {items && items.length > 0 ? (
          <ul className={styles.mediaGrid}>
            {items.map((m) => (
              <li key={m.id}>
                <button type="button" className={`${styles.mediaPick} ${styles.mediaCard}`} onClick={() => onPick(m)}>
                  <span className={styles.mediaThumb}>
                    {m.mime.startsWith("image/") ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={mediaUrl(m.path) ?? ""} alt={m.alt} loading="lazy" />
                    ) : (
                      <span className={styles.mediaPreviewEmpty} style={{ height: "100%" }}>
                        PDF
                      </span>
                    )}
                  </span>
                  <span className={styles.rowSub}>{m.path.split("/").pop()}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </dialog>
  );
}
