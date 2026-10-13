import type { MetadataRoute } from "next";
import { getSettings } from "@/lib/content";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const settings = await getSettings();
  return {
    name: settings.seo_title,
    short_name: settings.display_name,
    description: settings.seo_description,
    start_url: "/",
    display: "browser",
    background_color: "#F6F9FC",
    theme_color: "#2F5BFF",
    icons: [
      { src: "/icon.svg", type: "image/svg+xml", sizes: "any" },
      { src: "/apple-icon", type: "image/png", sizes: "180x180" },
    ],
  };
}
