import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

/** Deletes log entries older than the retention period (0 keeps everything). Needs an admin session. */
export async function pruneMailLog(supabase: SupabaseClient<Database>, days?: number) {
  let retention = days;
  if (retention === undefined) {
    const { data } = await supabase.from("mail_settings").select("log_retention_days").eq("id", true).maybeSingle();
    retention = data?.log_retention_days ?? 0;
  }
  if (!retention) return 0;
  const cutoff = new Date(Date.now() - retention * 86_400_000).toISOString();
  const { data, error } = await supabase.from("mail_log").delete().lt("created_at", cutoff).select("id");
  if (error) {
    console.warn("Email log prune failed:", error.message);
    return 0;
  }
  return data?.length ?? 0;
}
