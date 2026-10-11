import type { Metadata } from "next";
import { LegalPage } from "@/components/site/LegalPage";
import { getBlocks } from "@/lib/content";

export async function generateMetadata(): Promise<Metadata> {
  const blocks = await getBlocks("privacy");
  return {
    title: blocks.page.title,
    description: "What personal information this website collects, why, and the choices you have.",
    alternates: { canonical: "/privacy" },
  };
}

export default async function PrivacyPage() {
  const { page } = await getBlocks("privacy");
  return <LegalPage title={page.title} updated={page.updated} body={page.body} />;
}
