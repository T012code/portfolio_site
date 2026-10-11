import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createSessionClient } from "@/lib/supabase/server";

export type AdminSession = {
  email: string;
  supabase: Awaited<ReturnType<typeof createSessionClient>>;
};

/** Pages: send anyone who isn't a fully verified admin to the login flow. */
export async function requireAdminPage(): Promise<AdminSession> {
  const result = await checkAdmin();
  if (result.status === "ok") return result.session;
  if (result.status === "needs-mfa") redirect("/admin/login?step=mfa");
  if (result.status === "forbidden") redirect("/admin/login?error=forbidden");
  redirect("/admin/login");
}

/** Server Actions: throw instead of redirecting, so the form can show the error. */
export async function requireAdminAction(): Promise<AdminSession> {
  const result = await checkAdmin();
  if (result.status !== "ok") throw new Error("Your session has expired. Sign in again.");
  return result.session;
}

// Deduplicated per request: the layout gate and the page share one check.
const checkAdmin = cache(async function checkAdmin(): Promise<
  | { status: "ok"; session: AdminSession }
  | { status: "signed-out" | "needs-mfa" | "forbidden" }
> {
  const supabase = await createSessionClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (error || !claims) return { status: "signed-out" };
  if (claims.aal !== "aal2") return { status: "needs-mfa" };
  const { data: isAdmin } = await supabase.rpc("am_i_admin");
  if (!isAdmin) return { status: "forbidden" };
  return { status: "ok", session: { email: String(claims.email ?? ""), supabase } };
});
