import type { MetadataRoute } from "next";
import { getProjects, getSettings } from "@/lib/content";
import { SITE_URL } from "@/lib/env";
import { mediaUrl } from "@/lib/media";

const abs = (path: string) => new URL(path, SITE_URL).toString();

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [settings, projects] = await Promise.all([getSettings(), getProjects()]);
  const portrait = mediaUrl(settings.portrait_path);
  const projectImages = projects.map((p) => mediaUrl(p.image_path)).filter((u): u is string => Boolean(u)).map(abs);
  return [
    { url: abs("/"), changeFrequency: "monthly", priority: 1, images: portrait ? [abs(portrait)] : undefined },
    { url: abs("/work"), changeFrequency: "monthly", priority: 0.9, images: projectImages },
    { url: abs("/resume"), changeFrequency: "monthly", priority: 0.9 },
    { url: abs("/about"), changeFrequency: "monthly", priority: 0.8 },
    { url: abs("/contact"), changeFrequency: "yearly", priority: 0.7 },
    { url: abs("/faq"), changeFrequency: "monthly", priority: 0.6 },
    { url: abs("/privacy"), changeFrequency: "yearly", priority: 0.2 },
    { url: abs("/terms"), changeFrequency: "yearly", priority: 0.2 },
  ];
}
