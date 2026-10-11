import type { Metadata } from "next";
import { LegalPage } from "@/components/site/LegalPage";
import { getBlocks } from "@/lib/content";

export async function generateMetadata(): Promise<Metadata> {
  const blocks = await getBlocks("terms");
  return {
    title: blocks.page.title,
    description: "The terms for using this website and how projects are agreed.",
    alternates: { canonical: "/terms" },
  };
}

export default async function TermsPage() {
  const { page } = await getBlocks("terms");
  return <LegalPage title={page.title} updated={page.updated} body={page.body} />;
}
