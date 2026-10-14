import "server-only";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/** The contact forms are checked by Turnstile once its secret key is set in the environment. */
export const turnstileReady = () => Boolean(process.env.TURNSTILE_SECRET_KEY);

type VerifyResponse = { success: boolean; action?: string; hostname?: string; "error-codes"?: string[] };

/**
 * Checks a Cloudflare Turnstile token from the contact form. A missing, reused or failed token
 * is refused. Only an unreachable Cloudflare lets a submission through (the honeypot, timing
 * check and database rate limits still apply), so an outage never loses a real enquiry.
 */
export async function verifyTurnstile(
  token: string,
  action: "enquiry" | "message",
  ip: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return { ok: true };
  if (!token) return { ok: false, reason: "missing-token" };
  let result: VerifyResponse;
  try {
    const body = new URLSearchParams({ secret, response: token });
    if (ip) body.set("remoteip", ip);
    const res = await fetch(VERIFY_URL, { method: "POST", body, cache: "no-store", signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    result = (await res.json()) as VerifyResponse;
  } catch (e) {
    console.warn("Turnstile verification unreachable; allowing the submission.", e);
    return { ok: true };
  }
  if (!result.success) return { ok: false, reason: (result["error-codes"] ?? ["failed"]).join(",") };
  if (result.action && result.action !== action) return { ok: false, reason: "wrong-action" };
  return { ok: true };
}
