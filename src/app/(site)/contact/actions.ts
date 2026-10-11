"use server";

import { after } from "next/server";
import { sendSubmissionEmails } from "@/lib/mail";
import { createPublicClient } from "@/lib/supabase/public";

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
  invalid_message: "Tell me a little more about the project (at least a sentence).",
  field_too_long: "One of the fields is too long.",
  rate_limited: "You've sent a few already. Give it an hour, or email me directly.",
};

const FIELD_FOR: Record<string, string> = {
  invalid_name: "name",
  invalid_email: "email",
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

function failure(code: string, values: Record<string, string>): SubmitState {
  const field = FIELD_FOR[code];
  return {
    status: "error",
    message: MESSAGES[code] ?? "Something went wrong. Try again, or email me directly.",
    errors: field ? { [field]: MESSAGES[code] } : undefined,
    values,
  };
}

export async function submitEnquiry(_prev: SubmitState, form: FormData): Promise<SubmitState> {
  const values = {
    name: text(form, "name", 120),
    email: text(form, "email", 254),
    whatsapp: text(form, "whatsapp", 40),
    company: text(form, "company", 160),
    service: text(form, "service", 120),
    budget: text(form, "budget", 120),
    timeline: text(form, "timeline", 120),
    message: text(form, "message", 5000),
  };
  if (looksAutomated(form)) return failure("rate_limited", values);

  const { data: id, error } = await createPublicClient().rpc("submit_enquiry", {
    p_name: values.name,
    p_email: values.email,
    p_whatsapp: values.whatsapp,
    p_company: values.company,
    p_service: values.service,
    p_budget: values.budget,
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
    ["Budget", values.budget],
    ["Timeline", values.timeline],
    ["Project", values.message],
  ];
  after(() =>
    sendSubmissionEmails({
      replyTo: values.email,
      subject: `New enquiry: ${values.service || "project"} from ${values.name}`,
      rows,
    }),
  );

  const details = [
    values.service && `Service: ${values.service}`,
    values.budget && `Budget: ${values.budget}`,
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

  const { data: id, error } = await createPublicClient().rpc("submit_message", {
    p_name: values.name,
    p_email: values.email,
    p_whatsapp: values.whatsapp,
    p_message: values.message,
  });
  if (error || !id) return failure(error?.message ?? "unknown", values);

  after(() =>
    sendSubmissionEmails({
      replyTo: values.email,
      subject: `New message from ${values.name}`,
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
