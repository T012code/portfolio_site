import type { Metadata, Viewport } from "next";
import { ThemeScript } from "@/components/theme/ThemeScript";
import { getSettings } from "@/lib/content";
import { SITE_URL } from "@/lib/env";
import { mediaUrl } from "@/lib/media";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  const ogImage = mediaUrl(settings.og_image_path) ?? "/og.png";
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: settings.seo_title, template: `%s · ${settings.display_name}` },
    description: settings.seo_description,
    applicationName: settings.display_name,
    authors: [{ name: settings.full_name }],
    openGraph: {
      type: "website",
      siteName: settings.display_name,
      title: settings.seo_title,
      description: settings.seo_description,
      images: [{ url: ogImage, width: 1200, height: 630, alt: settings.seo_title }],
    },
    alternates: { canonical: "/" },
    twitter: { card: "summary_large_image" },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#EDEBE7" },
    { media: "(prefers-color-scheme: dark)", color: "#262222" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeScript />
        <link rel="preload" href="/fonts/archivo-latin.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
      </head>
      <body>{children}</body>
    </html>
  );
}
