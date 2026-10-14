import { SUPABASE_URL } from "@/lib/env";

export const MEDIA_BUCKET = "media";

/** Folder for optimized images. Files under uploads/ are stored as uploaded (PDFs, SVGs, older images). */
export const OPTIMIZED_PREFIX = "images/";

// Raster formats the optimizer handles. SVG is vector and is stored as uploaded.
const RASTER = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

export const isRaster = (mime: string) => RASTER.has(mime);

/** An image still stored as uploaded, which the Media page can optimize. */
export const needsOptimizing = (file: { path: string; mime: string }) =>
  isRaster(file.mime) && !file.path.startsWith(OPTIMIZED_PREFIX);

// Paths starting with "/" are bundled files in /public (temporary images, the default CV);
// everything else is an object key in the Supabase `media` bucket.
export function mediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith("/") || /^https?:\/\//.test(path)) return path;
  return `${SUPABASE_URL}/storage/v1/object/public/${MEDIA_BUCKET}/${path
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
}
