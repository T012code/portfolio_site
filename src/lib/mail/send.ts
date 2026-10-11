import "server-only";
import nodemailer from "nodemailer";
import { getSettings } from "@/lib/content";
import { SITE_URL } from "@/lib/env";
import { createPublicClient } from "@/lib/supabase/public";
import type { Row } from "@/lib/supabase/database.types";
import { decryptSecret, mailGate } from "./secret";
import { firstName, renderTemplate, safeName, tableEmailHtml, textEmailHtml, type TemplateKey } from "./templates";

export type MailSettings = Row<"mail_settings">;
export type MailTemplate = Row<"mail_templates">;
export type MailKind = "notification" | "autoreply" | "reply" | "test";
export type MailResult = { status: "sent" | "failed" | "skipped"; detail: string };

type Runtime = { settings: MailSettings; password: string | null; templates: Partial<Record<TemplateKey, MailTemplate>> };

/** Settings, decrypted password and templates. Uses the anon client: the gate is the credential. */
export async function loadMailRuntime(): Promise<{ ok: true; runtime: Runtime } | { ok: false; reason: string }> {
  const gate = mailGate();
  if (!gate) return { ok: false, reason: "MAIL_SECRET is not set on the server." };
  const { data, error } = await createPublicClient().rpc("mail_runtime", { p_gate: gate });
  if (error || !data) {
    return { ok: false, reason: "Email isn't set up yet. Save the SMTP settings under Admin → Email." };
  }
  const raw = data as { settings: MailSettings; password_enc: string | null; templates: Runtime["templates"] };
  return { ok: true, runtime: { settings: raw.settings, password: decryptSecret(raw.password_enc), templates: raw.templates } };
}

export function smtpProblem(settings: MailSettings, password: string | null) {
  if (!settings.host || !settings.username) return "Add the SMTP server and username.";
  if (!password) return "Add the SMTP password (an app password from Zoho or Google).";
  if (!settings.from_email) return "Add the address emails are sent from.";
  return null;
}

export function createTransport(settings: MailSettings, password: string) {
  return nodemailer.createTransport({
    host: settings.host,
    port: settings.port,
    secure: settings.security === "ssl",
    requireTLS: settings.security === "starttls",
    auth: { user: settings.username, pass: password },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });
}

export function describeError(error: unknown) {
  const e = error as { code?: string; responseCode?: number; response?: string; message?: string };
  if (e.code === "EAUTH") {
    return "The SMTP server rejected the username or password. Zoho and Gmail both need an app password here, not your normal sign-in password.";
  }
  if (e.code === "ENOTFOUND" || e.code === "EDNS") {
    return "Couldn't find that SMTP server. Check the server name (Zoho on your own domain: smtppro.zoho.com; Gmail: smtp.gmail.com).";
  }
  if (e.code === "ETIMEDOUT" || e.code === "ECONNECTION" || e.code === "ESOCKET") {
    return `Couldn't connect to the SMTP server (${e.code}). Check the host, port and security setting.`;
  }
  if (e.responseCode === 553 || e.responseCode === 550) {
    return `The server refused the sender (${e.responseCode}). The "from" address must belong to the SMTP account.`;
  }
  return (e.response || e.message || "Unknown error").slice(0, 400);
}

type Outgoing = {
  kind: MailKind;
  to: string;
  subject: string;
  text: string;
  html: string;
  replyTo?: string;
  headers?: Record<string, string>;
  ref?: { type: "enquiry" | "message"; id: string };
};

/** Sends one email and records it in the log, whatever the outcome. */
export async function deliver(runtime: Runtime, mail: Outgoing): Promise<MailResult> {
  const gate = mailGate();
  if (!gate) return { status: "failed", detail: "MAIL_SECRET is not set on the server." };
  const db = createPublicClient();

  const { data: begun, error: beginError } = await db.rpc("mail_log_begin", {
    p_gate: gate,
    p_kind: mail.kind,
    p_to: mail.to,
    p_subject: mail.subject,
    p_ref_type: mail.ref?.type ?? null,
    p_ref_id: mail.ref?.id ?? null,
  });
  if (beginError || !begun) return { status: "failed", detail: "Couldn't write to the email log." };
  const { id, allowed } = begun as { id: string; allowed: boolean };
  if (!allowed) return { status: "skipped", detail: "Limit reached for this address." };

  const finish = async (result: MailResult, messageId: string | null = null) => {
    await db.rpc("mail_log_finish", {
      p_gate: gate,
      p_id: id,
      p_status: result.status,
      p_detail: result.detail,
      p_message_id: messageId,
    });
    return result;
  };

  const { settings, password } = runtime;
  if (!settings.enabled && mail.kind !== "test") {
    return finish({ status: "skipped", detail: "Sending is switched off in Admin → Email." });
  }
  const problem = smtpProblem(settings, password);
  if (problem || !password) return finish({ status: "failed", detail: problem ?? "SMTP isn't configured." });

  try {
    const info = await createTransport(settings, password).sendMail({
      from: { name: settings.from_name, address: settings.from_email },
      to: mail.to,
      replyTo: mail.replyTo,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
      headers: mail.headers,
    });
    return finish({ status: "sent", detail: String(info.response ?? "").slice(0, 400) }, info.messageId ?? null);
  } catch (error) {
    console.error("Email failed", error);
    return finish({ status: "failed", detail: describeError(error) });
  }
}

// ── Contact form ────────────────────────────────────────────────────────

// "Landing page" → "landing page", but "WordPress" and "IT consulting" keep their capitals.
function lowerFirst(value: string) {
  const [word] = value.split(" ");
  return /[A-Z]/.test(word.slice(1)) ? value : value.charAt(0).toLowerCase() + value.slice(1);
}

type Submission = {
  type: "enquiry" | "message";
  id: string;
  name: string;
  email: string;
  service?: string;
  rows: [string, string][];
};

/** Owner notification plus the visitor autoreply. Runs after the response is sent. */
export async function handleSubmissionEmails(sub: Submission) {
  const loaded = await loadMailRuntime();
  if (!loaded.ok) {
    console.warn("Email skipped:", loaded.reason);
    return;
  }
  const { runtime } = loaded;
  const { settings } = runtime;
  const site = await getSettings();
  const brand = settings.from_name || site.display_name;
  const ref = { type: sub.type, id: sub.id } as const;
  const jobs: Promise<MailResult>[] = [];

  const notify = sub.type === "enquiry" ? settings.notify_enquiries : settings.notify_messages;
  if (notify) {
    const subject =
      sub.type === "enquiry"
        ? `New enquiry: ${sub.service || "project"} from ${sub.name}`
        : `New message from ${sub.name}`;
    const intro = sub.type === "enquiry" ? "A new service enquiry came in through the website." : "A new message came in through the website.";
    jobs.push(
      deliver(runtime, {
        kind: "notification",
        to: settings.notify_email || settings.from_email,
        subject: subject.slice(0, 200),
        text: [intro, "", ...sub.rows.filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`)].join("\n"),
        html: tableEmailHtml(sub.rows, brand, intro),
        replyTo: sub.email,
        ref,
      }),
    );
  }

  const template = runtime.templates[`${sub.type}_autoreply`];
  if (template?.enabled && template.subject.trim() && template.body.trim()) {
    // Only a service from the site's own list is echoed back; anything else reads "your project".
    const service = sub.service && site.service_options.includes(sub.service) && sub.service !== "Other" ? sub.service : "";
    const vars = {
      first_name: firstName(sub.name),
      name: safeName(sub.name) || "there",
      service: service ? `your ${lowerFirst(service)} project` : "your project",
      booking_url: site.cal_link ? `https://cal.com/${site.cal_link}` : `${SITE_URL}/contact`,
      site_name: site.display_name,
      site_url: SITE_URL.replace(/^https?:\/\//, ""),
    };
    const text = renderTemplate(template.body, vars);
    jobs.push(
      deliver(runtime, {
        kind: "autoreply",
        to: sub.email,
        subject: renderTemplate(template.subject, vars).slice(0, 200),
        text,
        html: textEmailHtml(text, brand, site.motto),
        replyTo: settings.from_email,
        // RFC 3834: marks this as automatic so other autoresponders don't answer it.
        headers: { "Auto-Submitted": "auto-replied", "X-Auto-Response-Suppress": "All" },
        ref,
      }),
    );
  }

  await Promise.all(jobs);
}
