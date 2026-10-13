import "server-only";
import { getSettings } from "@/lib/content";
import { SITE_URL } from "@/lib/env";
import { decryptSecret, mailGate } from "@/lib/mail/secret";
import { firstName, renderTemplate, safeName, type TemplateVars } from "@/lib/mail/templates";
import { createPublicClient } from "@/lib/supabase/public";
import type { Row } from "@/lib/supabase/database.types";

export type WhatsAppSettings = Row<"whatsapp_settings">;
export type WhatsAppKind = "autoreply" | "reply" | "template" | "test";
export type WhatsAppResult = { status: "sent" | "failed" | "skipped"; detail: string };
export type WhatsAppRuntime = { settings: WhatsAppSettings; token: string | null; appSecret: string | null };

/** Settings and decrypted credentials. Uses the anon client: the gate is the credential. */
export async function loadWhatsAppRuntime(): Promise<{ ok: true; runtime: WhatsAppRuntime } | { ok: false; reason: string }> {
  const gate = mailGate();
  if (!gate) return { ok: false, reason: "MAIL_SECRET is not set on the server." };
  const { data, error } = await createPublicClient().rpc("whatsapp_runtime", { p_gate: gate });
  if (error || !data) return { ok: false, reason: "WhatsApp isn't set up yet. Save the settings under Admin → WhatsApp." };
  const raw = data as { settings: WhatsAppSettings; token_enc: string | null; app_secret_enc: string | null };
  return {
    ok: true,
    runtime: { settings: raw.settings, token: decryptSecret(raw.token_enc), appSecret: decryptSecret(raw.app_secret_enc) },
  };
}

export function whatsAppProblem(rt: WhatsAppRuntime) {
  if (!rt.settings.phone_number_id) return "Add the phone number ID from Meta.";
  if (!rt.token) return "Add the access token from Meta.";
  return null;
}

/**
 * Turns what people type into WhatsApp's format: country code and number, digits only.
 * Nigerian local numbers (0803…) get +234. Returns null when it can't be a phone number.
 */
export function normalizeNumber(raw: string) {
  let digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) digits = digits.slice(1);
  else if (digits.startsWith("00")) digits = digits.slice(2);
  else if (/^0[789][01]\d{8}$/.test(digits)) digits = `234${digits.slice(1)}`;
  digits = digits.replace(/\D/g, "");
  return /^[1-9]\d{7,14}$/.test(digits) ? digits : null;
}

export function formatNumber(waId: string) {
  return `+${waId}`;
}

type GraphError = { error?: { message?: string; code?: number; error_subcode?: number; error_data?: { details?: string } } };

export function describeGraphError(body: GraphError, status: number) {
  const e = body.error;
  const code = e?.code;
  if (code === 190) return "Meta rejected the access token (expired or revoked). Create a permanent System User token and save it again.";
  if (code === 131047 || code === 131051)
    return "More than 24 hours have passed since this person last messaged you. WhatsApp only allows an approved template message now.";
  if (code === 131026) return "This number can't receive WhatsApp messages (not on WhatsApp, or an old app version).";
  if (code === 132001) return "Meta can't find that template in that language. Check the name and language under WhatsApp Manager → Message templates.";
  if (code === 132000) return "The template expects a different number of variables. It should have exactly one: {{1}}, the first name.";
  if (code === 133010) return "This phone number isn't registered with the WhatsApp Cloud API yet. Finish its setup in Meta.";
  if (code === 100) return `Meta rejected a setting: ${e?.error_data?.details ?? e?.message ?? "check the phone number ID."}`;
  if (code === 80007 || code === 130429) return "Meta's rate limit was reached. Try again in a few minutes.";
  return (e?.error_data?.details || e?.message || `Meta returned HTTP ${status}.`).slice(0, 400);
}

async function graph(rt: WhatsAppRuntime, path: string, init?: { method?: string; body?: unknown }) {
  const url = `https://graph.facebook.com/${rt.settings.graph_version}/${path}`;
  try {
    const res = await fetch(url, {
      method: init?.method ?? "GET",
      headers: { Authorization: `Bearer ${rt.token}`, "Content-Type": "application/json" },
      body: init?.body ? JSON.stringify(init.body) : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown> & GraphError;
    return { ok: res.ok, status: res.status, json };
  } catch (error) {
    return { ok: false, status: 0, json: { error: { message: `Couldn't reach Meta: ${(error as Error).message}` } } as GraphError };
  }
}

/** Checks the token and phone number ID together. */
export async function checkPhoneNumber(rt: WhatsAppRuntime) {
  const res = await graph(rt, `${rt.settings.phone_number_id}?fields=display_phone_number,verified_name,quality_rating`);
  if (!res.ok) return { ok: false as const, message: describeGraphError(res.json, res.status) };
  const info = res.json as { display_phone_number?: string; verified_name?: string; quality_rating?: string };
  return { ok: true as const, number: info.display_phone_number ?? "", name: info.verified_name ?? "", quality: info.quality_rating ?? "" };
}

type Outgoing = {
  kind: WhatsAppKind;
  to: string;
  name?: string;
  ref?: { type: "enquiry" | "message"; id: string };
} & ({ text: string } | { template: { name: string; lang: string; firstName: string } });

/** Sends one WhatsApp message and records it in the log, whatever the outcome. */
export async function deliverWhatsApp(rt: WhatsAppRuntime, msg: Outgoing): Promise<WhatsAppResult> {
  const gate = mailGate();
  if (!gate) return { status: "failed", detail: "MAIL_SECRET is not set on the server." };
  const db = createPublicClient();
  const preview =
    "text" in msg
      ? msg.text
      : `Template “${msg.template.name}” (${msg.template.lang})${msg.template.firstName ? `, first name: ${msg.template.firstName}` : ""}`;

  const { data: id, error } = await db.rpc("whatsapp_log_outbound", {
    p_gate: gate,
    p_kind: msg.kind,
    p_wa_id: msg.to,
    p_name: msg.name ?? "",
    p_body: preview,
    p_ref_type: msg.ref?.type ?? null,
    p_ref_id: msg.ref?.id ?? null,
  });
  if (error || !id) return { status: "failed", detail: "Couldn't write to the WhatsApp log." };

  const finish = async (result: WhatsAppResult, wamid: string | null = null) => {
    await db.rpc("whatsapp_log_finish", { p_gate: gate, p_id: id, p_status: result.status, p_detail: result.detail, p_wamid: wamid });
    return result;
  };

  if (!rt.settings.enabled && msg.kind !== "test") return finish({ status: "skipped", detail: "WhatsApp is switched off in Admin → WhatsApp." });
  const problem = whatsAppProblem(rt);
  if (problem) return finish({ status: "failed", detail: problem });

  const payload =
    "text" in msg
      ? { messaging_product: "whatsapp", recipient_type: "individual", to: msg.to, type: "text", text: { body: msg.text, preview_url: true } }
      : {
          messaging_product: "whatsapp",
          to: msg.to,
          type: "template",
          template: {
            name: msg.template.name,
            language: { code: msg.template.lang },
            // Meta's sample "hello_world" has no variables; the enquiry template has one: {{1}}.
            ...(msg.template.firstName
              ? { components: [{ type: "body", parameters: [{ type: "text", text: msg.template.firstName }] }] }
              : {}),
          },
        };
  const res = await graph(rt, `${rt.settings.phone_number_id}/messages`, { method: "POST", body: payload });
  if (!res.ok) return finish({ status: "failed", detail: describeGraphError(res.json, res.status) });
  const wamid = (res.json as { messages?: { id?: string }[] }).messages?.[0]?.id ?? null;
  return finish({ status: "sent", detail: "Accepted by WhatsApp." }, wamid);
}

export async function templateVars(name: string): Promise<TemplateVars> {
  const site = await getSettings();
  return {
    first_name: firstName(name),
    name: safeName(name) || "there",
    booking_url: site.cal_link ? `https://cal.com/${site.cal_link}` : `${SITE_URL}/contact`,
    site_name: site.display_name,
    site_url: SITE_URL.replace(/^https?:\/\//, ""),
  };
}

export function renderWhatsApp(body: string, vars: TemplateVars) {
  return renderTemplate(body, vars).trim().slice(0, 4096);
}

/**
 * After an enquiry with a WhatsApp number: the approved template, if switched on.
 * Business-initiated messages must be templates; WhatsApp blocks free text here.
 */
export async function handleEnquiryWhatsApp(sub: { id: string; name: string; whatsapp: string }) {
  if (!sub.whatsapp) return;
  const loaded = await loadWhatsAppRuntime();
  if (!loaded.ok) return;
  const { settings } = loaded.runtime;
  if (!settings.enabled || !settings.form_template_enabled || !settings.form_template_name) return;
  const to = normalizeNumber(sub.whatsapp);
  if (!to) return;
  await deliverWhatsApp(loaded.runtime, {
    kind: "template",
    to,
    name: safeName(sub.name),
    template: { name: settings.form_template_name, lang: settings.form_template_lang, firstName: firstName(sub.name) },
    ref: { type: "enquiry", id: sub.id },
  });
}
