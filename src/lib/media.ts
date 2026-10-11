import { SUPABASE_URL } from "@/lib/env";

export const MEDIA_BUCKET = "media";

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
