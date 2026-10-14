"use client";

import { useId, useRef, useState } from "react";
import type { Field, FieldValue } from "@/lib/admin/fields";
import { mediaUrl } from "@/lib/media";
import { MediaPicker } from "./MediaPicker";
import { IMAGE_TYPES, uploadMedia } from "./upload";
import styles from "../admin.module.css";

export function FieldInput({ field, value, error }: { field: Field; value: FieldValue; error?: string }) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [field.hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined;
  const common = {
    id,
    name: field.name,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedBy,
    className: styles.input,
  } as const;

  if (field.kind === "boolean") {
    return (
      <label className={styles.check}>
        <input type="checkbox" name={field.name} defaultChecked={value === true} />
        {field.label}
      </label>
    );
  }

  let control: React.ReactNode;
  switch (field.kind) {
    case "textarea":
      control = (
        <textarea {...common} defaultValue={String(value ?? "")} maxLength={field.max} required={field.required} rows={field.rows} />
      );
      break;
    case "lines":
    case "tags":
      control = (
        <textarea
          {...common}
          defaultValue={Array.isArray(value) ? value.join(field.kind === "tags" ? ", " : "\n") : ""}
          rows={field.kind === "tags" ? 2 : Math.max(3, (Array.isArray(value) ? value.length : 0) + 1)}
        />
      );
      break;
    case "date":
      control = <input {...common} type="date" defaultValue={typeof value === "string" ? value : ""} required={field.required} />;
      break;
    case "image":
    case "file":
      control = <MediaInput field={field} value={typeof value === "string" ? value : null} describedBy={describedBy} id={id} />;
      break;
    default:
      control = (
        <input
          {...common}
          type={field.kind === "url" ? "url" : field.kind === "email" ? "email" : "text"}
          defaultValue={String(value ?? "")}
          maxLength={field.max}
          required={field.required}
          placeholder={field.kind === "slug" ? "generated-from-title" : undefined}
        />
      );
  }

  return (
    <div className={`${styles.field} ${field.half ? styles.half : ""}`}>
      <label htmlFor={id} className={styles.fieldLabel}>
        {field.label}
        {field.required ? <span aria-hidden="true"> *</span> : null}
      </label>
      {control}
      {field.hint ? (
        <span id={hintId} className={styles.hint}>
          {field.hint}
        </span>
      ) : null}
      {error ? (
        <span id={errorId} className={styles.fieldError}>
          {error}
        </span>
      ) : null}
    </div>
  );
}

function MediaInput({
  field,
  value,
  describedBy,
  id,
}: {
  field: Field;
  value: string | null;
  describedBy?: string;
  id: string;
}) {
  const [path, setPath] = useState<string | null>(value);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const isImage = field.kind === "image";
  const url = mediaUrl(path);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const { media, warning } = await uploadMedia(file);
      setPath(media.path);
      if (warning) setError(warning);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className={styles.mediaField} aria-describedby={describedBy}>
      <input type="hidden" name={field.name} value={path ?? ""} />
      <div className={`${styles.mediaPreview} ${url ? "" : styles.mediaPreviewEmpty}`}>
        {url && isImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" />
        ) : url ? (
          <a href={url} target="_blank" rel="noopener" className={styles.mediaPreviewEmpty} style={{ height: "100%" }}>
            Open PDF
          </a>
        ) : (
          "None"
        )}
      </div>
      <div className={styles.stack} style={{ gap: "var(--space-2)" }}>
        <div className={styles.mediaButtons}>
          <button type="button" id={id} className={styles.smallButton} onClick={() => fileRef.current?.click()} disabled={busy}>
            {busy ? "Uploading…" : "Upload"}
          </button>
          <button type="button" className={styles.smallButton} onClick={() => setPicking(true)} disabled={busy}>
            Library
          </button>
          {path ? (
            <button type="button" className={`${styles.smallButton} ${styles.dangerButton}`} onClick={() => setPath(null)}>
              Remove
            </button>
          ) : null}
        </div>
        {error ? <span className={styles.fieldError}>{error}</span> : null}
      </div>
      <input
        ref={fileRef}
        type="file"
        hidden
        accept={field.accept ?? (isImage ? IMAGE_TYPES : "application/pdf")}
        onChange={(e) => onFile(e.target.files?.[0])}
      />
      <MediaPicker
        open={picking}
        accept={isImage ? "image" : "pdf"}
        onClose={() => setPicking(false)}
        onPick={(m) => {
          setPath(m.path);
          setPicking(false);
        }}
      />
    </div>
  );
}
