import "server-only";
import sharp from "sharp";
import { OPTIMIZED_PREFIX } from "@/lib/media";

/** Longest side of a stored image: a full-width image on a 2x screen. next/image serves smaller sizes from it. */
export const MAX_EDGE = 2560;

const OUTPUT = {
  jpeg: { mime: "image/jpeg", ext: "jpg" },
  png: { mime: "image/png", ext: "png" },
  webp: { mime: "image/webp", ext: "webp" },
} as const;

export type OptimizedImage = {
  data: Buffer;
  mime: string;
  ext: string;
  width: number;
  height: number;
  /** False when the original was already upright, clean and compact, and is kept byte for byte. */
  reencoded: boolean;
};

/**
 * Makes the stored copy that the site, share cards and sitemap read: turned upright, at most 2560px on
 * the long side, converted to sRGB, and stripped of EXIF, XMP and IPTC data (phone photos carry their
 * GPS location there). Opaque images become JPEG at quality 85 with full-resolution colour (4:4:4), which
 * keeps interface text and thin coloured lines crisp; images with real transparency become WebP.
 *
 * next/image then re-encodes this copy to AVIF or WebP for each screen size. Measured with SSIM, pages
 * built from this copy came out within 0.004 of pages built from the untouched original.
 *
 * A file that is already upright, within 2560px and free of metadata is kept as it is when re-encoding
 * would save less than 10%, so a well-exported image doesn't lose a generation of quality for nothing.
 * Animated images are kept as they are.
 */
export async function optimizeImage(input: Buffer): Promise<OptimizedImage> {
  // "error" rather than the default "warning": phone JPEGs with minor warnings still decode fine.
  const meta = await sharp(input, { failOn: "error" }).metadata();
  const keepAs = meta.format === "jpeg" || meta.format === "png" || meta.format === "webp" ? OUTPUT[meta.format] : null;

  if ((meta.pages ?? 1) > 1) {
    if (!keepAs) throw new Error("Animated images in this format aren't supported.");
    return { data: input, ...keepAs, width: meta.width, height: meta.height, reencoded: false };
  }

  const transparent = Boolean(meta.hasAlpha) && !(await sharp(input, { failOn: "error" }).stats()).isOpaque;
  const pipeline = sharp(input, { failOn: "error" })
    .autoOrient()
    .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true });
  const { data, info } = transparent
    ? await pipeline.webp({ quality: 90, alphaQuality: 100, smartSubsample: true, effort: 5 }).toBuffer({ resolveWithObject: true })
    : await pipeline
        .removeAlpha()
        .jpeg({ quality: 85, mozjpeg: true, chromaSubsampling: "4:4:4" })
        .toBuffer({ resolveWithObject: true });

  const clean = !meta.exif && !meta.xmp && !meta.iptc && (meta.orientation ?? 1) === 1;
  const fits = Math.max(meta.width, meta.height) <= MAX_EDGE;
  if (keepAs && clean && fits && data.length > input.length * 0.9) {
    return { data: input, ...keepAs, width: meta.width, height: meta.height, reencoded: false };
  }

  return { data, ...(transparent ? OUTPUT.webp : OUTPUT.jpeg), width: info.width, height: info.height, reencoded: true };
}

/** images/<year>/<random>-<name>.<ext>, keeping the readable name from the uploaded file's key. */
export function optimizedPath(sourcePath: string, ext: string) {
  const file = sourcePath.split("/").pop() ?? "";
  const name = file.replace(/\.[a-z0-9]+$/i, "").replace(/^[0-9a-f]{8}-/, "") || "image";
  return `${OPTIMIZED_PREFIX}${new Date().getUTCFullYear()}/${crypto.randomUUID().slice(0, 8)}-${name}.${ext}`;
}
