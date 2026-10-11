"use server";

import { refresh } from "next/cache";
import { requireAdminAction } from "@/lib/admin/auth";
import { pruneMailLog } from "@/lib/mail/log";
import { AUTOREPLY_HEADERS, deliver, loadMailRuntime, type MailKind, type MailResult } from "@/lib/mail/send";
import type { FormState } from "./actions";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const RETENTION = [0, 7, 30, 90, 180, 365];
const KINDS: MailKind[] = ["notification", "autoreply", "reply", "test"];

export type LogEntry = {
  id: string;
  created_at: string;
  kind: string;
  to_email: string;
  reply_to: string | null;
  subject: string;
  status: string;
  detail: string;
  message_id: string | null;
  body_text: string | null;
  body_html: string | null;
  resent_from: string | null;
};

/** One entry with its stored content, for the preview. */
export async function getLogEntry(id: string): Promise<{ ok: true; entry: LogEntry } | { ok: false; message: string }> {
  const { supabase } = await requireAdminAction();
  if (!UUID.test(id)) return { ok: false, message: "Unknown entry." };
  const { data, error } = await supabase
    .from("mail_log")
    .select("id, created_at, kind, to_email, reply_to, subject, status, detail, message_id, body_text, body_html, resent_from")
    .eq("id", id)
    .maybeSingle();
  if (error) return { ok: false, message: error.message };
  if (!data) return { ok: false, message: "This entry no longer exists." };
  return { ok: true, entry: data };
}

/** Sends a logged email again, exactly as stored, to the same address. Logged as a new entry. */
export async function resendLogEntry(id: string): Promise<MailResult> {
  const { supabase } = await requireAdminAction();
  if (!UUID.test(id)) return { status: "failed", detail: "Unknown entry." };
  const { data: row } = await supabase
    .from("mail_log")
    .select("id, kind, to_email, reply_to, subject, body_text, body_html, ref_type, ref_id")
    .eq("id", id)
    .maybeSingle();
  if (!row) return { status: "failed", detail: "This entry no longer exists." };
  if (!row.body_text && !row.body_html) {
    return { status: "failed", detail: "The content of this email wasn't kept, so it can't be sent again." };
  }
  const kind = KINDS.includes(row.kind as MailKind) ? (row.kind as MailKind) : "reply";

  const loaded = await loadMailRuntime();
  if (!loaded.ok) return { status: "failed", detail: loaded.reason };
  const result = await deliver(loaded.runtime, {
    kind,
    to: row.to_email,
    subject: row.subject,
    text: row.body_text ?? "",
    html: row.body_html ?? undefined,
    replyTo: row.reply_to ?? undefined,
    headers: kind === "autoreply" ? AUTOREPLY_HEADERS : undefined,
    ref: row.ref_id && (row.ref_type === "enquiry" || row.ref_type === "message") ? { type: row.ref_type, id: row.ref_id } : undefined,
    resentFrom: row.id,
  });
  refresh();
  return result;
}

export async function deleteLogEntries(ids: string[]): Promise<{ ok: boolean; message: string }> {
  const { supabase } = await requireAdminAction();
  const clean = [...new Set(ids)].filter((id) => UUID.test(id)).slice(0, 500);
  if (clean.length === 0) return { ok: false, message: "Nothing selected." };
  const { data, error } = await supabase.from("mail_log").delete().in("id", clean).select("id");
  if (error) return { ok: false, message: error.message };
  refresh();
  const n = data?.length ?? 0;
  return { ok: true, message: `Deleted ${n} ${n === 1 ? "entry" : "entries"}.` };
}

export async function saveLogStorage(_prev: FormState, form: FormData): Promise<FormState> {
  let session;
  try {
    session = await requireAdminAction();
  } catch (e) {
    return { status: "error", message: (e as Error).message };
  }
  const days = Number(form.get("log_retention_days"));
  if (!RETENTION.includes(days)) return { status: "error", message: "Pick how long to keep entries." };
  const store = form.get("log_store_content") === "on";

  const { error } = await session.supabase
    .from("mail_settings")
    .update({ log_retention_days: days, log_store_content: store })
    .eq("id", true);
  if (error) return { status: "error", message: error.message };

  const removed = await pruneMailLog(session.supabase, days);
  refresh();
  return {
    status: "success",
    message: `Saved.${removed ? ` Removed ${removed} ${removed === 1 ? "entry" : "entries"} older than ${days} days.` : ""}`,
  };
}

/** Keeps the log entries but drops the stored email content. */
export async function clearLogContent(): Promise<{ ok: boolean; message: string }> {
  const { supabase } = await requireAdminAction();
  const { data, error } = await supabase
    .from("mail_log")
    .update({ body_text: null, body_html: null })
    .or("body_text.not.is.null,body_html.not.is.null")
    .select("id");
  if (error) return { ok: false, message: error.message };
  refresh();
  const n = data?.length ?? 0;
  return { ok: true, message: `Cleared the content of ${n} ${n === 1 ? "email" : "emails"}. The entries stay in the log.` };
}

export async function clearLog(): Promise<{ ok: boolean; message: string }> {
  const { supabase } = await requireAdminAction();
  const { data, error } = await supabase.from("mail_log").delete().gte("created_at", "1970-01-01").select("id");
  if (error) return { ok: false, message: error.message };
  refresh();
  const n = data?.length ?? 0;
  return { ok: true, message: `Deleted all ${n} ${n === 1 ? "entry" : "entries"}.` };
}
