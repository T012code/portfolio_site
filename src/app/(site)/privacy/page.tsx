import type { Metadata } from "next";
import { ConsentSettings } from "@/components/site/ConsentPanel";
import { LegalPage } from "@/components/site/LegalPage";
import { getBlocks, getSettings } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const [blocks, settings] = await Promise.all([getBlocks("privacy"), getSettings()]);
  return pageMetadata({
    settings,
    title: blocks.page.title,
    description: "What personal information this website collects, why, and the choices you have.",
    path: "/privacy",
  });
}

export default async function PrivacyPage() {
  const [{ page }, settings] = await Promise.all([getBlocks("privacy"), getSettings()]);
  return (
    <LegalPage
      title={page.title}
      updated={page.updated}
      body={page.body}
      preface={<ConsentSettings owner={settings.full_name} name={settings.display_name} />}
    />
  );
}
