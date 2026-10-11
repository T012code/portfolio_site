"use client";

import { useState, useTransition } from "react";
import { mediaUrl } from "@/lib/media";
import type { Row } from "@/lib/supabase/database.types";
import { deleteMedia, updateMediaAlt } from "../../actions";
import { IMAGE_TYPES, uploadMedia } from "../upload";
import styles from "../../admin.module.css";

type Media = Row<"media">;

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function MediaLibrary({ initial }: { initial: Media[] }) {
  const [items, setItems] = useState(initial);
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function upload(files: FileList | File[]) {
    setError(null);
    setNotice(null);
    const list = Array.from(files);
    setBusy((n) => n + list.length);
    const added: Media[] = [];
    for (const file of list) {
      try {
        added.push(await uploadMedia(file));
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setBusy((n) => n - 1);
      }
    }
    if (added.length) {
      setItems((current) => [...added.reverse(), ...current]);
      setNotice(`${added.length} file${added.length > 1 ? "s" : ""} uploaded.`);
    }
  }

  function remove(item: Media) {
    if (!window.confirm("Delete this file? This can't be undone.")) return;
    setError(null);
    startTransition(async () => {
      try {
        await deleteMedia(item.id);
        setItems((current) => current.filter((m) => m.id !== item.id));
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }

  function saveAlt(item: Media, alt: string) {
    if (alt === item.alt) return;
    startTransition(async () => {
      try {
        await updateMediaAlt(item.id, alt);
        setItems((current) => current.map((m) => (m.id === item.id ? { ...m, alt } : m)));
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }

  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setNotice("Link copied.");
    } catch {
      setNotice(url);
    }
  }

  return (
    <div>
      <label
        className={styles.dropzone}
        data-over={over || undefined}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          if (e.dataTransfer.files.length) upload(e.dataTransfer.files);
        }}
      >
        <strong>{busy > 0 ? `Uploading ${busy}…` : "Drop files here or click to upload"}</strong>
        <span className={styles.muted}>JPG, PNG, WebP, AVIF, SVG or PDF</span>
        <input
          type="file"
          multiple
          className="visually-hidden"
          accept={`${IMAGE_TYPES},application/pdf`}
          onChange={(e) => {
            if (e.target.files?.length) upload(e.target.files);
            e.target.value = "";
          }}
        />
      </label>

      <div aria-live="polite">
        {error ? (
          <p className={styles.alertError} role="alert" style={{ marginBottom: "var(--space-6)" }}>
            {error}
          </p>
        ) : null}
        {notice ? (
          <p className={styles.alertSuccess} style={{ marginBottom: "var(--space-6)" }}>
            {notice}
          </p>
        ) : null}
      </div>

      {items.length === 0 ? (
        <p className={styles.empty}>Nothing uploaded yet.</p>
      ) : (
        <ul className={styles.mediaGrid}>
          {items.map((m) => {
            const url = mediaUrl(m.path) ?? "";
            const isImage = m.mime.startsWith("image/");
            return (
              <li key={m.id} className={styles.mediaCard}>
                <a href={url} target="_blank" rel="noopener" className={styles.mediaThumb}>
                  {isImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={url} alt={m.alt} loading="lazy" />
                  ) : (
                    <span className={styles.mediaPreviewEmpty} style={{ height: "100%" }}>
                      PDF
                    </span>
                  )}
                </a>
                <span className={styles.rowSub} title={m.path}>
                  {m.path.split("/").pop()}
                </span>
                <span className={styles.hint}>
                  {formatSize(m.size_bytes)}
                  {m.width && m.height ? ` · ${m.width}×${m.height}` : ""}
                </span>
                {isImage ? (
                  <input
                    className={styles.input}
                    aria-label="Image description"
                    placeholder="Describe this image"
                    defaultValue={m.alt}
                    onBlur={(e) => saveAlt(m, e.target.value.trim())}
                  />
                ) : null}
                <div className={styles.mediaButtons}>
                  <button type="button" className={styles.smallButton} onClick={() => copy(url)}>
                    Copy link
                  </button>
                  <button
                    type="button"
                    className={`${styles.smallButton} ${styles.dangerButton}`}
                    onClick={() => remove(m)}
                    disabled={pending}
                  >
                    Delete
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
