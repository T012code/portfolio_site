import "server-only";
import { cache } from "react";
import { requireAdminPage } from "./auth";

/** New-item counts, shared by the sidebar badge and the dashboard in one request. */
export const getNewInboxCounts = cache(async () => {
  const { supabase } = await requireAdminPage();
  const [enquiries, messages] = await Promise.all([
    supabase.from("enquiries").select("id", { count: "exact", head: true }).eq("status", "new"),
    supabase.from("messages").select("id", { count: "exact", head: true }).eq("status", "new"),
  ]);
  return { enquiries: enquiries.count ?? 0, messages: messages.count ?? 0 };
});
