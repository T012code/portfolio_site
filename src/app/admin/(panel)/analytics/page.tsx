import { requireAdminPage } from "@/lib/admin/auth";
import { AnalyticsView, RANGES, type ConsentSummary, type Summary } from "./AnalyticsView";
import admin from "../../admin.module.css";

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const { supabase } = await requireAdminPage();
  const { range } = await searchParams;
  const days = RANGES.find((r) => String(r.days) === range)?.days ?? 30;
  const [{ data, error }, consentResult] = await Promise.all([
    supabase.rpc("analytics_summary", { p_days: days }),
    supabase.rpc("consent_summary", { p_days: days }),
  ]);
  const s = data as Summary | null;
  // Missing until the consent_log migration runs; the page works without it.
  const consent = consentResult.error ? null : (consentResult.data as ConsentSummary | null);

  if (error || !s) {
    return (
      <>
        <header className={admin.pageHead}>
          <h1 className={admin.pageTitle}>Analytics</h1>
        </header>
        <p className={admin.muted}>Analytics could not be loaded{error ? `: ${error.message}` : "."}</p>
      </>
    );
  }

  return <AnalyticsView s={s} days={days} consent={consent} />;
}
