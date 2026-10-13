"use server";

import { after } from "next/server";
import { getSettings } from "@/lib/content";
import { domainAcceptsMail } from "@/lib/mail/dns";
import { handleSubmissionEmails } from "@/lib/mail/send";
import { verifyRecaptcha } from "@/lib/recaptcha";
import { handleEnquiryWhatsApp } from "@/lib/whatsapp/send";
import { createPublicClient } from "@/lib/supabase/public";
import { emailProblem, normaliseEmail } from "@/lib/validate";
import { normalisePhone } from "@/lib/phone";

export type SubmitState =
  | { status: "idle" }
  | { status: "error"; message: string; errors?: Record<string, string>; values?: Record<string, string> }
  | {
      status: "success";
      id: string;
      prefill: { name: string; email: string; phone: string; notes: string };
    };

const MIN_FILL_MS = 2500;

const MESSAGES: Record<string, string> = {
  invalid_name: "Add your name.",
  invalid_email: "Check your email address.",
  email_domain: "That email domain doesn't accept mail. Check the spelling after the @.",
  invalid_phone: "Check the WhatsApp number and its country code.",
  invalid_message: "Tell me a little more about the project (at least a sentence).",
  field_too_long: "One of the fields is too long.",
  rate_limited: "You've sent a few already. Give it an hour, or email me directly.",
  recaptcha_failed: "This didn't pass the spam check. Try again in a moment, or email me directly.",
};

async function passesSpamCheck(form: FormData, action: "enquiry" | "message") {
  const result = await verifyRecaptcha(await getSettings(), text(form, "recaptcha_token", 4000), action);
  if (!result.ok) console.info(`reCAPTCHA rejected a ${action}: ${result.reason}`);
  return result.ok;
}

const FIELD_FOR: Record<string, string> = {
  invalid_name: "name",
  invalid_email: "email",
  email_domain: "email",
  invalid_phone: "whatsapp",
  invalid_message: "message",
};

function text(form: FormData, key: string, max = 5000) {
  const value = form.get(key);
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

// Bots fill hidden fields and submit instantly; people do neither.
function looksAutomated(form: FormData) {
  if (text(form, "website")) return true;
  const started = Number(text(form, "started"));
  return !Number.isFinite(started) || started <= 0 || Date.now() - started < MIN_FILL_MS;
}

function failure(code: string, values: Record<string, string>, detail?: string): SubmitState {
  const field = FIELD_FOR[code];
  const message = detail ?? MESSAGES[code] ?? "Something went wrong. Try again, or email me directly.";
  return {
    status: "error",
    message,
    errors: field ? { [field]: message } : undefined,
    values,
  };
}

/** Email and phone checks shared by both forms; returns a failure, or null when both pass. */
async function checkContact(values: { email: string; whatsapp: string }): Promise<SubmitState | null> {
  const problem = emailProblem(values.email);
  if (problem) return failure("invalid_email", values, problem);
  values.email = normaliseEmail(values.email);
  if (!(await domainAcceptsMail(values.email.slice(values.email.lastIndexOf("@") + 1)))) return failure("email_domain", values);
  if (values.whatsapp) {
    const phone = normalisePhone(values.whatsapp);
    if (!phone) return failure("invalid_phone", values);
    values.whatsapp = phone;
  }
  return null;
}

const SYMBOLS: Record<string, string> = { NGN: "₦", USD: "$" };

/** "1,500,000" + NGN → "₦1,500,000". A symbol or code the visitor typed themselves is dropped first. */
function formatBudget(amount: string, currency: string) {
  const symbol = SYMBOLS[currency] ?? SYMBOLS.NGN;
  const clean = amount.replace(/^\s*(₦|\$|ngn|usd|naira|dollars?)\s*/i, "").trim();
  if (!clean) return "";
  return `${symbol}${clean}`.slice(0, 120);
}

export async function submitEnquiry(_prev: SubmitState, form: FormData): Promise<SubmitState> {
  const values = {
    name: text(form, "name", 120),
    email: text(form, "email", 254),
    whatsapp: text(form, "whatsapp", 40),
    company: text(form, "company", 160),
    service: text(form, "service", 120),
    budget_amount: text(form, "budget_amount", 60),
    budget_currency: text(form, "budget_currency", 3),
    timeline: text(form, "timeline", 120),
    message: text(form, "message", 5000),
  };
  if (looksAutomated(form)) return failure("rate_limited", values);
  const invalid = await checkContact(values);
  if (invalid) return invalid;
  if (!(await passesSpamCheck(form, "enquiry"))) return failure("recaptcha_failed", values);
  const budget = formatBudget(values.budget_amount, values.budget_currency);

  const { data: id, error } = await createPublicClient().rpc("submit_enquiry", {
    p_name: values.name,
    p_email: values.email,
    p_whatsapp: values.whatsapp,
    p_company: values.company,
    p_service: values.service,
    p_budget: budget,
    p_timeline: values.timeline,
    p_message: values.message,
  });
  if (error || !id) return failure(error?.message ?? "unknown", values);

  const rows: [string, string][] = [
    ["Name", values.name],
    ["Email", values.email],
    ["WhatsApp", values.whatsapp],
    ["Company", values.company],
    ["Service", values.service],
    ["Budget", budget],
    ["Timeline", values.timeline],
    ["Project", values.message],
  ];
  after(() =>
    handleEnquiryWhatsApp({ id, name: values.name, whatsapp: values.whatsapp }).catch((e) =>
      console.error("WhatsApp confirmation failed", e),
    ),
  );
  after(() =>
    handleSubmissionEmails({
      type: "enquiry",
      id,
      name: values.name,
      email: values.email,
      service: values.service,
      rows,
    }),
  );

  const details = [
    values.service && `Service: ${values.service}`,
    budget && `Budget: ${budget}`,
    values.timeline && `Timeline: ${values.timeline}`,
    values.company && `Company: ${values.company}`,
  ].filter(Boolean);
  const notes = [...details, "", values.message].join("\n").trim().slice(0, 1500);

  return {
    status: "success",
    id,
    prefill: { name: values.name, email: values.email, phone: values.whatsapp, notes },
  };
}

export async function submitMessage(_prev: SubmitState, form: FormData): Promise<SubmitState> {
  const values = {
    name: text(form, "name", 120),
    email: text(form, "email", 254),
    whatsapp: text(form, "whatsapp", 40),
    message: text(form, "message", 5000),
  };
  if (looksAutomated(form)) return failure("rate_limited", values);
  const invalid = await checkContact(values);
  if (invalid) return invalid;
  if (!(await passesSpamCheck(form, "message"))) return failure("recaptcha_failed", values);

  const { data: id, error } = await createPublicClient().rpc("submit_message", {
    p_name: values.name,
    p_email: values.email,
    p_whatsapp: values.whatsapp,
    p_message: values.message,
  });
  if (error || !id) return failure(error?.message ?? "unknown", values);

  after(() =>
    handleSubmissionEmails({
      type: "message",
      id,
      name: values.name,
      email: values.email,
      rows: [
        ["Name", values.name],
        ["Email", values.email],
        ["WhatsApp", values.whatsapp],
        ["Message", values.message],
      ],
    }),
  );

  return { status: "success", id, prefill: { name: values.name, email: values.email, phone: values.whatsapp, notes: "" } };
}
