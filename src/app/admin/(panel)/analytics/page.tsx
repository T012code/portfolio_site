import { requireAdminPage } from "@/lib/admin/auth";
import { AnalyticsView, RANGES, type Summary } from "./AnalyticsView";
import admin from "../../admin.module.css";

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const { supabase } = await requireAdminPage();
  const { range } = await searchParams;
  const days = RANGES.find((r) => String(r.days) === range)?.days ?? 30;
  const { data, error } = await supabase.rpc("analytics_summary", { p_days: days });
  const s = data as Summary | null;

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

  return <AnalyticsView s={s} days={days} />;
}
