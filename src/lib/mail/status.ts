import "server-only";
import type { AdminSession } from "@/lib/admin/auth";
import { gateHash, mailGate, mailSecretConfigured } from "./secret";
import { loadMailRuntime, smtpProblem } from "./send";

export type MailHealth = {
  secretConfigured: boolean;
  passwordSet: boolean;
  /** The saved password can't be decrypted (MAIL_SECRET changed): it must be entered again. */
  passwordUnreadable: boolean;
  enabled: boolean;
  problem: string | null;
  ready: boolean;
};

/**
 * Health of the email setup for the dashboard. Also (re)registers the server's gate with the
 * database, so a fresh database or a rotated MAIL_SECRET starts working without a manual step.
 */
export async function getMailHealth(session: AdminSession): Promise<MailHealth> {
  const secretConfigured = mailSecretConfigured();
  let loaded = await loadMailRuntime();
  if (!loaded.ok && secretConfigured) {
    const gate = mailGate();
    if (gate) {
      await session.supabase.rpc("mail_set_secret", { p_password_enc: null, p_gate_hash: gateHash(gate) });
      loaded = await loadMailRuntime();
    }
  }
  const { data: status } = await session.supabase.rpc("mail_secret_status");
  const passwordSet = Boolean((status as { password_set?: boolean } | null)?.password_set);

  if (!loaded.ok) {
    return { secretConfigured, passwordSet, passwordUnreadable: false, enabled: false, problem: loaded.reason, ready: false };
  }
  const { settings, password } = loaded.runtime;
  const passwordUnreadable = passwordSet && !password;
  const problem = passwordUnreadable
    ? "The saved SMTP password can't be read (the server key changed). Enter it again."
    : smtpProblem(settings, password);
  return {
    secretConfigured,
    passwordSet,
    passwordUnreadable,
    enabled: settings.enabled,
    problem,
    ready: settings.enabled && !problem,
  };
}
