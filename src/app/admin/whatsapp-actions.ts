"use server";

import crypto from "node:crypto";
import { refresh } from "next/cache";
import { requireAdminAction } from "@/lib/admin/auth";
import { encryptSecret, gateHash, mailGate } from "@/lib/mail/secret";
import {
  checkPhoneNumber,
  deliverWhatsApp,
  loadWhatsAppRuntime,
  normalizeNumber,
  type WhatsAppResult,
} from "@/lib/whatsapp/send";
import type { FormState } from "./actions";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function str(form: FormData, key: string, max = 500) {
  const v = form.get(key);
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

async function session() {
  try {
    return { ok: true as const, session: await requireAdminAction() };
  } catch (e) {
    return { ok: false as const, state: { status: "error", message: (e as Error).message } satisfies FormState };
  }
}

export async function saveWhatsAppConnection(_prev: FormState, form: FormData): Promise<FormState> {
  const auth = await session();
  if (!auth.ok) return auth.state;
  const { supabase } = auth.session;

  const phoneId = str(form, "phone_number_id", 30);
  const wabaId = str(form, "business_account_id", 30);
  const version = str(form, "graph_version", 6) || "v23.0";
  const token = str(form, "access_token", 1000);
  const appSecret = str(form, "app_secret", 200);
  const enabled = form.get("enabled") === "on";

  const errors: Record<string, string> = {};
  if (phoneId && !/^\d{5,30}$/.test(phoneId)) errors.phone_number_id = "The phone number ID is a long number from Meta (not your phone number).";
  if (wabaId && !/^\d{5,30}$/.test(wabaId)) errors.business_account_id = "The WhatsApp Business Account ID is a long number from Meta.";
  if (!/^v\d{1,2}\.\d$/.test(version)) errors.graph_version = "Use a version like v23.0.";
  if (token && !/^[A-Za-z0-9_-]{40,1000}$/.test(token)) errors.access_token = "That doesn't look like a Meta access token.";
  if (appSecret && !/^[a-f0-9]{32}$/i.test(appSecret)) errors.app_secret = "The app secret is 32 letters and numbers (Meta app → App settings → Basic).";

  const { data: status } = await supabase.rpc("whatsapp_secret_status");
  const has = (status ?? {}) as { token_set?: boolean; app_secret_set?: boolean };
  if (enabled && (!phoneId || (!token && !has.token_set))) errors.enabled = "Add the phone number ID and access token before switching WhatsApp on.";
  if (Object.keys(errors).length) return { status: "error", message: "Check the highlighted fields.", errors };

  if (token || appSecret) {
    const gate = mailGate();
    if (!gate) return { status: "error", message: "MAIL_SECRET isn't set on the server, so the token can't be stored safely." };
    const { error } = await supabase.rpc("whatsapp_set_secret", {
      p_token_enc: token ? encryptSecret(token) : null,
      p_app_secret_enc: appSecret ? encryptSecret(appSecret) : null,
      p_gate_hash: gateHash(gate),
    });
    if (error) return { status: "error", message: error.message };
  }

  const { error } = await supabase
    .from("whatsapp_settings")
    .update({ enabled, phone_number_id: phoneId, business_account_id: wabaId, graph_version: version })
    .eq("id", true);
  if (error) return { status: "error", message: error.message };
  refresh();
  return { status: "success", message: enabled ? "Saved. WhatsApp is on." : "Saved. WhatsApp is off." };
}

export async function saveWhatsAppReplies(_prev: FormState, form: FormData): Promise<FormState> {
  const auth = await session();
  if (!auth.ok) return auth.state;
  const body = String(form.get("autoreply_body") ?? "").replace(/\r\n/g, "\n").trim();
  const hours = Number(form.get("autoreply_cooldown_hours"));
  const templateName = str(form, "form_template_name", 512);
  const templateLang = str(form, "form_template_lang", 10) || "en";
  const templateOn = form.get("form_template_enabled") === "on";

  const errors: Record<string, string> = {};
  if (body.length > 1024) errors.autoreply_body = "Keep it under 1,024 characters.";
  if (![1, 6, 12, 24, 48, 72, 168].includes(hours)) errors.autoreply_cooldown_hours = "Pick how often a number can get the auto-reply.";
  if (templateName && !/^[a-z0-9_]+$/.test(templateName)) errors.form_template_name = "Template names use lowercase letters, numbers and underscores.";
  if (!/^[a-z]{2,3}(_[A-Z]{2})?$/.test(templateLang)) errors.form_template_lang = "Use a code like en, en_US or en_GB.";
  if (templateOn && !templateName) errors.form_template_enabled = "Add the approved template's name first.";
  if (Object.keys(errors).length) return { status: "error", message: "Check the highlighted fields.", errors };

  const { error } = await auth.session.supabase
    .from("whatsapp_settings")
    .update({
      autoreply_enabled: form.get("autoreply_enabled") === "on",
      autoreply_body: body,
      autoreply_cooldown_hours: hours,
      notify_email: form.get("notify_email") === "on",
      form_template_enabled: templateOn,
      form_template_name: templateName,
      form_template_lang: templateLang,
    })
    .eq("id", true);
  if (error) return { status: "error", message: error.message };
  refresh();
  return { status: "success", message: "Saved." };
}

export async function regenerateVerifyToken(): Promise<{ ok: boolean; message: string }> {
  const { supabase } = await requireAdminAction();
  const token = crypto.randomBytes(18).toString("hex");
  const { error } = await supabase.from("whatsapp_settings").update({ verify_token: token }).eq("id", true);
  if (error) return { ok: false, message: error.message };
  refresh();
  return { ok: true, message: "New verify token made. Paste it into the Meta app's webhook settings." };
}

export async function checkWhatsAppConnection(): Promise<{ ok: boolean; message: string }> {
  const { supabase } = await requireAdminAction();
  const loaded = await loadWhatsAppRuntime();
  if (!loaded.ok) return { ok: false, message: loaded.reason };
  if (!loaded.runtime.settings.phone_number_id || !loaded.runtime.token) return { ok: false, message: "Save the phone number ID and access token first." };
  const result = await checkPhoneNumber(loaded.runtime);
  if (!result.ok) return { ok: false, message: result.message };
  await supabase.from("whatsapp_settings").update({ display_number: result.number.slice(0, 40) }).eq("id", true);
  refresh();
  const quality = result.quality ? ` Quality rating: ${result.quality.toLowerCase()}.` : "";
  return { ok: true, message: `Connected to ${result.number}${result.name ? ` (${result.name})` : ""}.${quality}` };
}

/** Meta's ready-made "hello_world" template: works on any new account, outside the 24-hour window. */
export async function sendWhatsAppTest(rawTo: string): Promise<WhatsAppResult> {
  await requireAdminAction();
  const to = normalizeNumber(rawTo);
  if (!to) return { status: "failed", detail: "Enter a number with its country code, e.g. +234 803 000 0000." };
  const loaded = await loadWhatsAppRuntime();
  if (!loaded.ok) return { status: "failed", detail: loaded.reason };
  const result = await deliverWhatsApp(loaded.runtime, {
    kind: "test",
    to,
    template: { name: "hello_world", lang: "en_US", firstName: "" },
  });
  refresh();
  return result;
}

export async function replyWhatsApp(rawTo: string, text: string): Promise<WhatsAppResult> {
  const { supabase } = await requireAdminAction();
  const to = normalizeNumber(rawTo.startsWith("+") ? rawTo : `+${rawTo}`);
  const body = text.replace(/\r\n/g, "\n").trim().slice(0, 4096);
  if (!to) return { status: "failed", detail: "Unknown number." };
  if (!body) return { status: "failed", detail: "Write a message first." };
  const { data: last } = await supabase
    .from("whatsapp_messages")
    .select("contact_name")
    .eq("wa_id", to)
    .eq("direction", "in")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const loaded = await loadWhatsAppRuntime();
  if (!loaded.ok) return { status: "failed", detail: loaded.reason };
  const result = await deliverWhatsApp(loaded.runtime, { kind: "reply", to, name: last?.contact_name ?? "", text: body });
  refresh();
  return result;
}

export async function deleteWhatsAppMessages(ids: string[]): Promise<{ ok: boolean; message: string }> {
  const { supabase } = await requireAdminAction();
  const clean = [...new Set(ids)].filter((id) => UUID.test(id)).slice(0, 500);
  if (!clean.length) return { ok: false, message: "Nothing selected." };
  const { data, error } = await supabase.from("whatsapp_messages").delete().in("id", clean).select("id");
  if (error) return { ok: false, message: error.message };
  refresh();
  const n = data?.length ?? 0;
  return { ok: true, message: `Deleted ${n} ${n === 1 ? "message" : "messages"}.` };
}

export async function deleteWhatsAppConversation(waId: string): Promise<{ ok: boolean; message: string }> {
  const { supabase } = await requireAdminAction();
  if (!/^\d{6,20}$/.test(waId)) return { ok: false, message: "Unknown conversation." };
  const { data, error } = await supabase.from("whatsapp_messages").delete().eq("wa_id", waId).select("id");
  if (error) return { ok: false, message: error.message };
  refresh();
  return { ok: true, message: `Deleted the conversation (${data?.length ?? 0} messages).` };
}
