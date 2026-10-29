"use server";

import { refresh } from "next/cache";
import { requireAdminAction } from "@/lib/admin/auth";
import { getSettings } from "@/lib/content";
import { checkDomain, providerFromHost, type DnsCheck, type MailProvider } from "@/lib/mail/dns";
import { encryptSecret, gateHash, mailGate } from "@/lib/mail/secret";
import { createTransport, deliver, describeError, loadMailRuntime, smtpProblem, type MailResult } from "@/lib/mail/send";
import {
  buildTemplateEmail,
  SAMPLE_VARS,
  TEMPLATE_KEYS,
  TEMPLATE_LABELS,
  TEMPLATE_VARS,
  textEmailHtml,
  unsafeHtml,
  type TemplateKey,
} from "@/lib/mail/templates";
import type { FormState } from "./actions";

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const HOST = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i;

function str(form: FormData, key: string, max = 500) {
  const v = form.get(key);
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

async function admin() {
  return requireAdminAction();
}

/** Registers the server's gate with the database (and optionally a new password). */
async function storeSecret(supabase: Awaited<ReturnType<typeof admin>>["supabase"], passwordEnc: string | null) {
  const gate = mailGate();
  if (!gate) throw new Error("MAIL_SECRET isn't set on the server. Add it in Vercel, redeploy, then save again.");
  const { error } = await supabase.rpc("mail_set_secret", { p_password_enc: passwordEnc, p_gate_hash: gateHash(gate) });
  if (error) throw new Error(error.message);
}

// ── SMTP settings ───────────────────────────────────────────────────────

export async function saveMailSettings(_prev: FormState, form: FormData): Promise<FormState> {
  let session;
  try {
    session = await admin();
  } catch (e) {
    return { status: "error", message: (e as Error).message };
  }

  const values = {
    enabled: form.get("enabled") === "on",
    host: str(form, "host", 253).toLowerCase(),
    port: Number(str(form, "port", 5)),
    security: str(form, "security") === "starttls" ? "starttls" : "ssl",
    username: str(form, "username", 254).toLowerCase(),
    from_name: str(form, "from_name", 80),
    from_email: str(form, "from_email", 254).toLowerCase(),
    notify_email: str(form, "notify_email", 254).toLowerCase(),
    notify_enquiries: form.get("notify_enquiries") === "on",
    notify_messages: form.get("notify_messages") === "on",
    dkim_selector: str(form, "dkim_selector", 63).toLowerCase() || "zmail",
  };
  const password = typeof form.get("password") === "string" ? String(form.get("password")) : "";
  const clearPassword = form.get("clear_password") === "on";

  const errors: Record<string, string> = {};
  if (values.host && !HOST.test(values.host)) errors.host = "Enter a server name like smtppro.zoho.com.";
  if (!Number.isInteger(values.port) || values.port < 1 || values.port > 65535) errors.port = "Enter a port, usually 465 or 587.";
  // Zoho and Gmail sign in with the mailbox address; services like Resend use a fixed word instead.
  if (values.username && /zoho|gmail|google/i.test(values.host) && !EMAIL.test(values.username)) {
    errors.username = "For Zoho and Gmail, the username is the full email address.";
  } else if (/\s/.test(values.username)) errors.username = "The username can't contain spaces.";
  if (!values.from_email || !EMAIL.test(values.from_email)) errors.from_email = "Enter the address emails are sent from.";
  if (values.notify_email && !EMAIL.test(values.notify_email)) errors.notify_email = "Check this address.";
  if (!/^[a-z0-9._-]{1,63}$/.test(values.dkim_selector)) errors.dkim_selector = "Letters, numbers, dots and dashes only.";
  if (password.length > 200) errors.password = "That password is too long.";
  if (values.enabled && (!values.host || !values.username)) errors.enabled = "Add the server and username before switching sending on.";
  if (Object.keys(errors).length > 0) return { status: "error", message: "Check the highlighted fields.", errors };

  const { data, error } = await session.supabase.from("mail_settings").update(values).eq("id", true).select("id");
  if (error) return { status: "error", message: error.message };
  if (!data?.length) return { status: "error", message: "The email settings row is missing. Run the database migrations." };

  try {
    await storeSecret(session.supabase, clearPassword ? "" : password ? encryptSecret(password) : null);
  } catch (e) {
    return { status: "error", message: (e as Error).message };
  }

  refresh();
  const warning =
    /zoho/i.test(values.host) && values.username && values.from_email.split("@")[1] !== values.username.split("@")[1]
      ? " Note: the sender address is on a different domain from the SMTP account, which Zoho usually rejects."
      : "";
  return { status: "success", message: `Email settings saved.${warning}` };
}

export async function testSmtpConnection(): Promise<MailResult> {
  await admin();
  const loaded = await loadMailRuntime();
  if (!loaded.ok) return { status: "failed", detail: loaded.reason };
  const { settings, password } = loaded.runtime;
  const problem = smtpProblem(settings, password);
  if (problem || !password) return { status: "failed", detail: problem ?? "SMTP isn't configured." };
  try {
    await createTransport(settings, password).verify();
    return { status: "sent", detail: `Connected to ${settings.host}:${settings.port} and signed in as ${settings.username}.` };
  } catch (e) {
    return { status: "failed", detail: describeError(e) };
  }
}

export async function sendTestEmail(to: string): Promise<MailResult> {
  await admin();
  const address = to.trim().toLowerCase();
  if (!EMAIL.test(address)) return { status: "failed", detail: "Enter a valid address to send the test to." };
  const loaded = await loadMailRuntime();
  if (!loaded.ok) return { status: "failed", detail: loaded.reason };
  const site = await getSettings();
  const text = `This is a test from your website's email settings.\n\nIf you can read this, sending works. Check that it landed in the inbox rather than spam: that tells you SPF, DKIM and DMARC are doing their job.\n\n${site.display_name}`;
  const result = await deliver(loaded.runtime, {
    kind: "test",
    to: address,
    subject: "Test email from your website",
    text,
    html: textEmailHtml(text, loaded.runtime.settings.from_name || site.display_name, { footer: site.motto, label: "Test email" }),
  });
  refresh();
  return result;
}

export async function checkDeliverability(): Promise<
  { domain: string; provider: MailProvider; checks: DnsCheck[] } | { error: string } | { info: string }
> {
  const { supabase } = await admin();
  const { data } = await supabase.from("mail_settings").select("from_email, dkim_selector, host").eq("id", true).single();
  const from = data?.from_email ?? "";
  const domain = from.split("@")[1];
  if (!domain) return { error: "Save a sender address first." };
  if (/^(gmail|googlemail)\.com$/i.test(domain)) {
    return {
      info: "You're sending from a gmail.com address. Google already publishes SPF, DKIM and DMARC for it, so there's nothing to add. For a professional sender on your own domain, use Zoho or Google Workspace with hello@layothedeveloper.com.",
    };
  }
  const provider = providerFromHost(data?.host ?? "");
  try {
    return { domain, provider, checks: await checkDomain(domain, data?.dkim_selector || "zmail", from, provider) };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

// ── Autoresponders ──────────────────────────────────────────────────────

export async function saveMailTemplate(key: string, _prev: FormState, form: FormData): Promise<FormState> {
  if (!TEMPLATE_KEYS.includes(key as TemplateKey)) return { status: "error", message: "Unknown template." };
  let session;
  try {
    session = await admin();
  } catch (e) {
    return { status: "error", message: (e as Error).message };
  }
  const values = {
    enabled: form.get("enabled") === "on",
    format: form.get("format") === "text" ? "text" : "html",
    subject: str(form, "subject", 400),
    body: (typeof form.get("body") === "string" ? String(form.get("body")) : "").replace(/\r\n/g, "\n").trim(),
  };
  const errors: Record<string, string> = {};
  if (values.subject.length > 200) errors.subject = "Keep the subject under 200 characters.";
  if (values.body.length > 5000) errors.body = "Keep the message under 5,000 characters.";
  if (values.format === "html") {
    const problem = unsafeHtml(values.body);
    if (problem) errors.body = problem;
  }
  if (values.enabled && !values.subject) errors.subject = "Add a subject, or switch this autoresponder off.";
  if (values.enabled && !values.body) errors.body = "Add a message, or switch this autoresponder off.";
  const known = new Set<string>(TEMPLATE_VARS.map((v) => v.key));
  const unknown = [...`${values.subject} ${values.body}`.matchAll(/\{\{\s*([a-z_]+)\s*\}\}/g)]
    .map((m) => m[1])
    .filter((k) => !known.has(k));
  if (unknown.length) errors.body = `Unknown placeholder: {{${unknown[0]}}}.`;
  if (Object.keys(errors).length > 0) return { status: "error", message: "Check the highlighted fields.", errors };

  const { data, error } = await session.supabase.from("mail_templates").update(values).eq("key", key).select("key");
  if (error) return { status: "error", message: error.message };
  if (!data?.length) return { status: "error", message: "This template is missing. Run the database migrations." };
  refresh();
  return { status: "success", message: values.enabled ? "Saved. New submissions get this reply." : "Saved. This autoresponder is off." };
}

export async function sendTemplatePreview(key: string, to: string): Promise<MailResult> {
  await admin();
  if (!TEMPLATE_KEYS.includes(key as TemplateKey)) return { status: "failed", detail: "Unknown template." };
  const address = to.trim().toLowerCase();
  if (!EMAIL.test(address)) return { status: "failed", detail: "Enter a valid address." };
  const loaded = await loadMailRuntime();
  if (!loaded.ok) return { status: "failed", detail: loaded.reason };
  const template = loaded.runtime.templates[key as TemplateKey];
  if (!template) return { status: "failed", detail: "Template not found." };
  const site = await getSettings();
  const email = buildTemplateEmail(
    template,
    SAMPLE_VARS,
    loaded.runtime.settings.from_name || site.display_name,
    site.motto,
    TEMPLATE_LABELS[key as TemplateKey],
  );
  const result = await deliver(loaded.runtime, {
    kind: "test",
    to: address,
    subject: `[Preview] ${email.subject}`,
    text: email.text,
    html: email.html,
  });
  refresh();
  return result;
}

// ── Replies from the inbox ──────────────────────────────────────────────

export async function sendInboxReply(
  kind: "enquiries" | "messages",
  id: string,
  subject: string,
  body: string,
): Promise<MailResult> {
  if (kind !== "enquiries" && kind !== "messages") return { status: "failed", detail: "Unknown inbox." };
  const { supabase } = await admin();
  const cleanSubject = subject.trim().slice(0, 200);
  const cleanBody = body.replace(/\r\n/g, "\n").trim().slice(0, 10_000);
  if (!cleanSubject || !cleanBody) return { status: "failed", detail: "Add a subject and a message." };

  const { data: entry, error } = await supabase.from(kind).select("id, email, status").eq("id", id).single();
  if (error || !entry) return { status: "failed", detail: "This item no longer exists." };

  const loaded = await loadMailRuntime();
  if (!loaded.ok) return { status: "failed", detail: loaded.reason };
  const site = await getSettings();
  const result = await deliver(loaded.runtime, {
    kind: "reply",
    to: entry.email,
    subject: cleanSubject,
    text: cleanBody,
    html: textEmailHtml(cleanBody, loaded.runtime.settings.from_name || site.display_name, {
      footer: site.motto,
      label: kind === "enquiries" ? "About your enquiry" : "Reply",
      toVisitor: true,
    }),
    replyTo: loaded.runtime.settings.from_email,
    ref: { type: kind === "enquiries" ? "enquiry" : "message", id: entry.id },
  });
  if (result.status === "sent" && entry.status === "new") {
    await supabase.from(kind).update({ status: "replied" }).eq("id", id);
  }
  refresh();
  return result;
}

// ── Admins and account ──────────────────────────────────────────────────

export async function addAdmin(email: string): Promise<{ ok: boolean; message: string }> {
  const { supabase } = await admin();
  const { error } = await supabase.rpc("admin_add", { p_email: email });
  if (error) return { ok: false, message: error.message === "invalid_email" ? "Check the email address." : error.message };
  refresh();
  return { ok: true, message: `${email.trim().toLowerCase()} can now sign in (with their own password and authenticator).` };
}

export async function removeAdmin(email: string): Promise<{ ok: boolean; message: string }> {
  const { supabase } = await admin();
  const { error } = await supabase.rpc("admin_remove", { p_email: email });
  if (error) {
    return { ok: false, message: error.message === "cannot_remove_self" ? "You can't remove yourself." : error.message };
  }
  refresh();
  return { ok: true, message: "Access removed." };
}

export async function changePassword(_prev: FormState, form: FormData): Promise<FormState> {
  let session;
  try {
    session = await admin();
  } catch (e) {
    return { status: "error", message: (e as Error).message };
  }
  const password = String(form.get("password") ?? "");
  const confirm = String(form.get("confirm") ?? "");
  if (password.length < 12) return { status: "error", message: "Use at least 12 characters.", errors: { password: "At least 12 characters." } };
  if (password.length > 72) return { status: "error", message: "Use 72 characters or fewer.", errors: { password: "72 characters or fewer." } };
  if (password !== confirm) return { status: "error", message: "The passwords don't match.", errors: { confirm: "Doesn't match." } };
  const { error } = await session.supabase.auth.updateUser({ password });
  if (error) return { status: "error", message: error.message };
  return { status: "success", message: "Password changed. Use it next time you sign in." };
}

export async function signOutEverywhereElse(): Promise<{ ok: boolean; message: string }> {
  const { supabase } = await admin();
  const { error } = await supabase.auth.signOut({ scope: "others" });
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: "Signed out of every other browser and device." };
}
