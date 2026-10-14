"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { mediaUrl, needsOptimizing } from "@/lib/media";
import type { Row } from "@/lib/supabase/database.types";
import { deleteMedia, optimizeMedia, updateMediaAlt } from "../../actions";
import { IMAGE_TYPES, uploadMedia } from "../upload";
import styles from "../../admin.module.css";

type Media = Row<"media">;

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const fileName = (path: string) => path.split("/").pop() ?? path;
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export function MediaLibrary({ initial }: { initial: Media[] }) {
  const [items, setItems] = useState(initial);
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const fullSize = items.filter(needsOptimizing);

  async function upload(files: FileList | File[]) {
    setError(null);
    setNotice(null);
    const list = Array.from(files);
    setBusy((n) => n + list.length);
    const added: Media[] = [];
    for (const file of list) {
      try {
        const { media, warning } = await uploadMedia(file);
        added.push(media);
        if (warning) setError(warning);
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

  // One image per request, so a long list never runs into a server time limit.
  async function optimizeAll() {
    const queue = items.filter(needsOptimizing);
    if (queue.length === 0) return;
    const ok = window.confirm(
      `Optimize ${plural(queue.length, "image")}? Each one is replaced by its optimized copy. Projects and settings switch to the new file; links you copied earlier stop working.`,
    );
    if (!ok) return;
    setError(null);
    setNotice(null);
    setProgress({ done: 0, total: queue.length });
    let saved = 0;
    let optimized = 0;
    const failed: string[] = [];
    for (const [i, item] of queue.entries()) {
      try {
        const result = await optimizeMedia(item.id);
        saved += Math.max(0, result.saved);
        optimized += 1;
        setItems((current) => current.map((m) => (m.id === item.id ? result.media : m)));
      } catch (e) {
        failed.push(`${fileName(item.path)}: ${(e as Error).message}`);
      }
      setProgress({ done: i + 1, total: queue.length });
    }
    setProgress(null);
    if (optimized > 0) setNotice(`Optimized ${plural(optimized, "image")} and saved ${formatSize(saved)}.`);
    if (failed.length > 0) setError(`Couldn't optimize ${failed.join("; ")}`);
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

      {fullSize.length > 0 || progress ? (
        <section className={styles.card} aria-labelledby="optimize-heading" style={{ marginBottom: "var(--space-8)" }}>
          <div>
            <h2 id="optimize-heading" className={styles.cardTitle}>
              Optimize earlier uploads
            </h2>
            <p className={styles.cardIntro}>
              {progress
                ? "Keep this tab open until it finishes."
                : `${plural(fullSize.length, "image")} from before optimizing was added ${fullSize.length === 1 ? "is" : "are"} stored at full size. Optimizing resizes each one to 2560px at most, turns it upright, removes hidden data such as a phone's GPS location and compresses it at high quality.`}
            </p>
          </div>
          {progress ? (
            <div className={styles.stack} style={{ gap: "var(--space-2)" }} role="status">
              <span className={styles.muted}>
                Optimizing {Math.min(progress.done + 1, progress.total)} of {progress.total}…
              </span>
              <div className={styles.progress}>
                <span style={{ transform: `scaleX(${progress.done / progress.total})` }} />
              </div>
            </div>
          ) : (
            <div>
              <Button type="button" icon="check" onClick={optimizeAll} disabled={busy > 0 || pending}>
                Optimize {plural(fullSize.length, "image")}
              </Button>
            </div>
          )}
        </section>
      ) : null}

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
                  {needsOptimizing(m) ? " · Full size" : ""}
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
                    disabled={pending || progress !== null}
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
