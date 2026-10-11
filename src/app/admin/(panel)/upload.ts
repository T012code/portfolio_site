"use client";

import { slugify } from "@/lib/admin/fields";
import { MEDIA_BUCKET } from "@/lib/media";
import { getBrowserClient } from "@/lib/supabase/browser";
import { registerMedia } from "../actions";

export const IMAGE_TYPES = "image/jpeg,image/png,image/webp,image/avif,image/svg+xml";
const MAX_BYTES = 10 * 1024 * 1024;

async function dimensions(file: File) {
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml") return { width: null, height: null };
  try {
    const bitmap = await createImageBitmap(file);
    const size = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return size;
  } catch {
    return { width: null, height: null };
  }
}

/** Upload straight from the browser to Storage (RLS checks the admin session), then record it. */
export async function uploadMedia(file: File) {
  if (file.size > MAX_BYTES) throw new Error(`${file.name} is over 10 MB.`);
  const dot = file.name.lastIndexOf(".");
  const base = slugify(dot > 0 ? file.name.slice(0, dot) : file.name) || "file";
  const ext = dot > 0 ? file.name.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, "") : "";
  const now = new Date();
  const path = `uploads/${now.getUTCFullYear()}/${crypto.randomUUID().slice(0, 8)}-${base}${ext ? `.${ext}` : ""}`;

  const supabase = getBrowserClient();
  const { error } = await supabase.storage
    .from(MEDIA_BUCKET)
    .upload(path, file, { contentType: file.type, cacheControl: "31536000", upsert: false });
  if (error) throw new Error(error.message);

  const size = await dimensions(file);
  try {
    return await registerMedia({ path, mime: file.type, size: file.size, ...size });
  } catch (e) {
    // Don't leave an orphan in the bucket that the library can't see or delete.
    await supabase.storage.from(MEDIA_BUCKET).remove([path]);
    throw e;
  }
}
