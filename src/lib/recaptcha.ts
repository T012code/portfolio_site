import "server-only";
import type { Settings } from "@/lib/content";
import { decryptSecret, mailGate } from "@/lib/mail/secret";
import { createPublicClient } from "@/lib/supabase/public";

const VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";

type VerifyResponse = {
  success: boolean;
  score?: number;
  action?: string;
  hostname?: string;
  "error-codes"?: string[];
};

export async function loadRecaptchaSecret() {
  const gate = mailGate();
  if (!gate) return null;
  const { data, error } = await createPublicClient().rpc("recaptcha_runtime", { p_gate: gate });
  if (error) return null;
  return decryptSecret(data);
}

export async function siteverify(secret: string, token: string): Promise<VerifyResponse | null> {
  try {
    const res = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token }),
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    return (await res.json()) as VerifyResponse;
  } catch {
    return null;
  }
}

/**
 * Checks a reCAPTCHA v3 token from the contact form. Misconfiguration or an unreachable Google
 * never blocks a real enquiry (the database rate limits still apply); a low score or a token
 * for the wrong form does.
 */
export async function verifyRecaptcha(
  settings: Pick<Settings, "recaptcha_enabled" | "recaptcha_site_key" | "recaptcha_min_score">,
  token: string,
  action: "enquiry" | "message",
): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!settings.recaptcha_enabled || !settings.recaptcha_site_key) return { ok: true };
  const secret = await loadRecaptchaSecret();
  if (!secret) {
    console.warn("reCAPTCHA is on but its secret key can't be read; skipping the check.");
    return { ok: true };
  }
  if (!token) return { ok: false, reason: "missing-token" };
  const result = await siteverify(secret, token);
  if (!result) {
    console.warn("reCAPTCHA verification unreachable; allowing the submission.");
    return { ok: true };
  }
  if (!result.success) return { ok: false, reason: (result["error-codes"] ?? ["failed"]).join(",") };
  if (result.action !== action) return { ok: false, reason: "wrong-action" };
  if ((result.score ?? 0) < settings.recaptcha_min_score) return { ok: false, reason: `low-score:${result.score}` };
  return { ok: true };
}
