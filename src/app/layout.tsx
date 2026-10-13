import type { Metadata, Viewport } from "next";
import { ThemeScript } from "@/components/theme/ThemeScript";
import { getSettings } from "@/lib/content";
import { SITE_URL } from "@/lib/env";
import { homeImage } from "@/lib/seo";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  const image = homeImage(settings);
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: settings.seo_title, template: `%s · ${settings.display_name}` },
    description: settings.seo_description,
    applicationName: settings.display_name,
    authors: [{ name: settings.full_name, url: SITE_URL }],
    creator: settings.full_name,
    publisher: settings.full_name,
    category: "technology",
    keywords: [
      settings.full_name,
      settings.display_name,
      "software engineer in Lagos",
      "full-stack developer Nigeria",
      "Next.js developer",
      "React developer",
      "WordPress developer",
      "WooCommerce developer",
      "Flutter app developer",
      "payment integration Paystack Stripe",
      "freelance web developer",
    ],
    formatDetection: { telephone: false, email: false, address: false },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
    },
    openGraph: {
      type: "website",
      url: "/",
      locale: "en_NG",
      siteName: settings.display_name,
      title: settings.seo_title,
      description: settings.seo_description,
      images: [{ url: image, width: 1200, height: 630, alt: settings.seo_title }],
    },
    alternates: { canonical: "/" },
    twitter: { card: "summary_large_image", title: settings.seo_title, description: settings.seo_description, images: [image] },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F6F9FC" },
    { media: "(prefers-color-scheme: dark)", color: "#0D111D" },
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
