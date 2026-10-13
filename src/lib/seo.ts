import type { Metadata } from "next";
import type { Settings } from "@/lib/content";
import { SITE_URL } from "@/lib/env";
import { mediaUrl } from "@/lib/media";

// Page-level metadata with the full Open Graph and Twitter set. Next replaces (not merges)
// a parent's openGraph object, so every page passes the whole thing through here.

export function ogImage(title: string, kicker?: string) {
  const params = new URLSearchParams({ title });
  if (kicker) params.set("kicker", kicker);
  return `/og?${params.toString()}`;
}

type PageMeta = {
  settings: Settings;
  /** Short title; the layout template appends " · Layò". */
  title: string;
  description: string;
  path: string;
  /** Headline on the share card (defaults to the title). */
  card?: string;
  kicker?: string;
  type?: "website" | "profile";
};

export function pageMetadata({ settings, title, description, path, card, kicker, type = "website" }: PageMeta): Metadata {
  const image = { url: ogImage(card ?? title, kicker ?? title), width: 1200, height: 630, alt: `${title}, ${settings.display_name}` };
  const fullTitle = `${title} · ${settings.display_name}`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type,
      url: path,
      siteName: settings.display_name,
      locale: "en_NG",
      title: fullTitle,
      description,
      images: [image],
      ...(type === "profile" ? { firstName: settings.full_name.split(" ")[0], lastName: settings.full_name.split(" ").slice(1).join(" ") } : {}),
    },
    twitter: { card: "summary_large_image", title: fullTitle, description, images: [image.url] },
  };
}

/** The site's home share image: an uploaded one from Settings, else the generated card. */
export function homeImage(settings: Settings) {
  return mediaUrl(settings.og_image_path) ?? ogImage(settings.seo_title, settings.motto);
}

// ── Structured data ──────────────────────────────────────────────────────
export const PERSON_ID = `${SITE_URL}/#person`;
export const WEBSITE_ID = `${SITE_URL}/#website`;

export function personNode(settings: Settings, extra: Record<string, unknown> = {}) {
  const portrait = mediaUrl(settings.portrait_path);
  return {
    "@type": "Person",
    "@id": PERSON_ID,
    name: settings.full_name,
    alternateName: settings.display_name,
    url: SITE_URL,
    email: `mailto:${settings.email}`,
    jobTitle: settings.taglines[0] ?? "Software engineer",
    image: portrait ? new URL(portrait, SITE_URL).toString() : undefined,
    address: { "@type": "PostalAddress", addressLocality: "Lagos", addressCountry: "NG" },
    sameAs: [settings.linkedin_url, settings.github_url].filter(Boolean),
    ...extra,
  };
}

export function websiteNode(settings: Settings) {
  return {
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    url: SITE_URL,
    name: settings.display_name,
    description: settings.seo_description,
    inLanguage: "en",
    publisher: { "@id": PERSON_ID },
  };
}

export function breadcrumbs(items: { name: string; path: string }[]) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: [{ name: "Home", path: "/" }, ...items].map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: new URL(item.path, SITE_URL).toString(),
    })),
  };
}

/** JSON-LD for a <script> tag; "<" is escaped so content can't close the tag. */
export function jsonLd(nodes: Record<string, unknown>[]) {
  return JSON.stringify({ "@context": "https://schema.org", "@graph": nodes }).replace(/</g, "\\u003c");
}
