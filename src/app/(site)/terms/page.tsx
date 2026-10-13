import type { Metadata } from "next";
import { LegalPage } from "@/components/site/LegalPage";
import { getBlocks, getSettings } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const [blocks, settings] = await Promise.all([getBlocks("terms"), getSettings()]);
  return pageMetadata({
    settings,
    title: blocks.page.title,
    description: "The terms for using this website and for enquiries and projects.",
    path: "/terms",
  });
}

export default async function TermsPage() {
  const { page } = await getBlocks("terms");
  return <LegalPage title={page.title} updated={page.updated} body={page.body} />;
}
