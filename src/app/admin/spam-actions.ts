"use server";

import { refresh, updateTag } from "next/cache";
import { requireAdminAction } from "@/lib/admin/auth";
import { encryptSecret, gateHash, mailGate } from "@/lib/mail/secret";
import { loadRecaptchaSecret, siteverify } from "@/lib/recaptcha";
import { TAGS } from "@/lib/tags";
import type { FormState } from "./actions";

const KEY = /^[A-Za-z0-9_-]{20,100}$/;

export async function saveSpamSettings(_prev: FormState, form: FormData): Promise<FormState> {
  let session;
  try {
    session = await requireAdminAction();
  } catch (e) {
    return { status: "error", message: (e as Error).message };
  }

  const enabled = form.get("recaptcha_enabled") === "on";
  const siteKey = String(form.get("recaptcha_site_key") ?? "").trim();
  const secret = String(form.get("recaptcha_secret") ?? "").trim();
  const clearSecret = form.get("clear_secret") === "on";
  const score = Number(form.get("recaptcha_min_score"));

  const errors: Record<string, string> = {};
  if (siteKey && !KEY.test(siteKey)) errors.recaptcha_site_key = "That doesn't look like a reCAPTCHA site key.";
  if (secret && !KEY.test(secret)) errors.recaptcha_secret = "That doesn't look like a reCAPTCHA secret key.";
  if (![0.3, 0.5, 0.7].includes(score)) errors.recaptcha_min_score = "Pick a strictness level.";

  const { data: hasSecret } = await session.supabase.rpc("recaptcha_secret_set");
  const willHaveSecret = clearSecret ? Boolean(secret) : Boolean(secret) || Boolean(hasSecret);
  if (enabled && (!siteKey || !willHaveSecret)) {
    errors.recaptcha_enabled = "Add both keys before switching protection on.";
  }
  if (Object.keys(errors).length > 0) return { status: "error", message: "Check the highlighted fields.", errors };

  if (secret || clearSecret) {
    const gate = mailGate();
    if (!gate) return { status: "error", message: "MAIL_SECRET isn't set on the server, so the secret key can't be stored safely." };
    const { error } = await session.supabase.rpc("recaptcha_set_secret", {
      p_secret_enc: secret ? encryptSecret(secret) : "",
      p_gate_hash: gateHash(gate),
    });
    if (error) return { status: "error", message: error.message };
  }

  const { data, error } = await session.supabase
    .from("site_settings")
    .update({ recaptcha_enabled: enabled, recaptcha_site_key: siteKey, recaptcha_min_score: score })
    .eq("id", true)
    .select("id");
  if (error) return { status: "error", message: error.message };
  if (!data?.length) return { status: "error", message: "The settings row is missing." };

  updateTag(TAGS.settings);
  refresh();
  return {
    status: "success",
    message: enabled ? "Saved. The contact forms are now checked by reCAPTCHA." : "Saved. reCAPTCHA is off.",
  };
}

/** Confirms the saved secret key is accepted by Google, without a real visitor token. */
export async function testRecaptchaSecret(): Promise<{ ok: boolean; message: string }> {
  await requireAdminAction();
  const secret = await loadRecaptchaSecret();
  if (!secret) return { ok: false, message: "No secret key saved yet (or MAIL_SECRET is missing on the server)." };
  const result = await siteverify(secret, "connection-test");
  if (!result) return { ok: false, message: "Couldn't reach Google to check the key. Try again shortly." };
  const codes = result["error-codes"] ?? [];
  if (codes.includes("invalid-input-secret")) return { ok: false, message: "Google rejected the secret key. Copy it again from the reCAPTCHA admin console." };
  return { ok: true, message: "Google accepted the secret key." };
}
