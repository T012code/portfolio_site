// Field definitions shared by admin forms (client) and validation (server).

export type FieldKind =
  | "text"
  | "textarea"
  | "lines"
  | "tags"
  | "boolean"
  | "date"
  | "url"
  | "email"
  | "slug"
  | "image"
  | "file";

export type Field = {
  name: string;
  label: string;
  kind: FieldKind;
  required?: boolean;
  hint?: string;
  max?: number;
  /** For slug fields: the field to derive the slug from. */
  from?: string;
  /** For file fields: the accepted MIME types. */
  accept?: string;
  /** Lay out at half width on wide screens. */
  half?: boolean;
};

export type FieldValue = string | string[] | boolean | null;

export function emptyValue(field: Field): FieldValue {
  switch (field.kind) {
    case "lines":
    case "tags":
      return [];
    case "boolean":
      return false;
    case "date":
    case "image":
    case "file":
      return null;
    default:
      return "";
  }
}

export function slugify(input: string) {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Parse a submitted FormData into typed values, collecting field errors. */
export function parseFields(fields: readonly Field[], form: FormData) {
  const values: Record<string, FieldValue> = {};
  const errors: Record<string, string> = {};

  for (const field of fields) {
    const raw = form.get(field.name);
    const text = typeof raw === "string" ? raw.trim() : "";
    const max = field.max ?? (field.kind === "textarea" ? 5000 : 300);

    switch (field.kind) {
      case "boolean":
        values[field.name] = raw === "on" || raw === "true";
        break;
      case "lines":
      case "tags": {
        const sep = field.kind === "tags" ? /[\n,]/ : /\n/;
        const list = text
          .split(sep)
          .map((s) => s.trim())
          .filter(Boolean);
        if (list.some((s) => s.length > max)) errors[field.name] = `Each entry must be under ${max} characters.`;
        if (field.required && list.length === 0) errors[field.name] = "Add at least one entry.";
        values[field.name] = list;
        break;
      }
      case "date":
        if (text && !/^\d{4}-\d{2}(-\d{2})?$/.test(text)) errors[field.name] = "Use a valid date.";
        values[field.name] = text ? (text.length === 7 ? `${text}-01` : text) : null;
        if (field.required && !text) errors[field.name] = "Required.";
        break;
      case "image":
      case "file":
        if (text && (text.length > 500 || text.includes(".."))) errors[field.name] = "Invalid file reference.";
        values[field.name] = text || null;
        break;
      case "url":
        if (text && !/^https?:\/\/[^\s]+$/i.test(text)) errors[field.name] = "Use a full URL starting with https://";
        values[field.name] = text;
        break;
      case "email":
        if (text && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(text)) errors[field.name] = "Use a valid email address.";
        values[field.name] = text;
        break;
      case "slug": {
        const slug = slugify(text || String(form.get(field.from ?? "") ?? ""));
        if (!slug) errors[field.name] = "Required.";
        values[field.name] = slug;
        break;
      }
      default:
        if (text.length > max) errors[field.name] = `Keep this under ${max} characters.`;
        values[field.name] = text;
    }

    if (field.required && !errors[field.name]) {
      const v = values[field.name];
      if (v === "" || v === null) errors[field.name] = "Required.";
    }
  }

  return { values, errors };
}
