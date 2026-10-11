import { cacheLife } from "next/cache";
import { Cursor } from "@/components/motion/Cursor";
import { SmoothScroll } from "@/components/motion/SmoothScroll";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { getSettings } from "@/lib/content";

async function currentYear() {
  "use cache";
  cacheLife("days");
  return new Date().getUTCFullYear();
}

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [settings, year] = await Promise.all([getSettings(), currentYear()]);
  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <div id="top" />
      <SiteHeader name={settings.display_name} />
      <main id="main" tabIndex={-1}>
        {children}
      </main>
      <SiteFooter settings={settings} year={year} />
      <SmoothScroll />
      <Cursor />
    </>
  );
}
