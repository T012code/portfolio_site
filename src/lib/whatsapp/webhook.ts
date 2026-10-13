import "server-only";
import crypto from "node:crypto";
import { mailGate } from "@/lib/mail/secret";
import { deliver, loadMailRuntime } from "@/lib/mail/send";
import { tableEmailHtml } from "@/lib/mail/templates";
import { createPublicClient } from "@/lib/supabase/public";
import { deliverWhatsApp, formatNumber, renderWhatsApp, templateVars, type WhatsAppRuntime } from "./send";

/** Meta signs each delivery with the app secret: X-Hub-Signature-256: sha256=<hex>. */
export function validSignature(raw: string, header: string | null, appSecret: string) {
  if (!header?.startsWith("sha256=")) return false;
  const expected = crypto.createHmac("sha256", appSecret).update(raw, "utf8").digest();
  const given = Buffer.from(header.slice(7), "hex");
  return given.length === expected.length && crypto.timingSafeEqual(given, expected);
}

type Message = {
  from?: string;
  id?: string;
  type?: string;
  text?: { body?: string };
  button?: { text?: string };
  interactive?: { button_reply?: { title?: string }; list_reply?: { title?: string } };
  image?: { caption?: string };
  video?: { caption?: string };
  document?: { caption?: string; filename?: string };
  location?: { name?: string; address?: string };
};
type Status = { id?: string; status?: string; errors?: { title?: string; message?: string; error_data?: { details?: string } }[] };
type Payload = {
  object?: string;
  entry?: {
    changes?: {
      field?: string;
      value?: {
        metadata?: { phone_number_id?: string };
        contacts?: { wa_id?: string; profile?: { name?: string } }[];
        messages?: Message[];
        statuses?: Status[];
      };
    }[];
  }[];
};

// What gets stored for each message type. Media itself isn't downloaded.
function textOf(m: Message) {
  switch (m.type) {
    case "text":
      return m.text?.body ?? "";
    case "button":
      return m.button?.text ?? "";
    case "interactive":
      return m.interactive?.button_reply?.title ?? m.interactive?.list_reply?.title ?? "";
    case "image":
    case "video":
      return `[${m.type}]${m[m.type]?.caption ? ` ${m[m.type]!.caption}` : ""}`;
    case "document":
      return `[document] ${m.document?.filename ?? ""}`.trim();
    case "location":
      return `[location] ${[m.location?.name, m.location?.address].filter(Boolean).join(", ")}`.trim();
    default:
      return `[${m.type ?? "message"}]`;
  }
}

const STATUS = new Set(["sent", "delivered", "read", "failed"]);

/** Records messages and delivery receipts, sends due auto-replies and the owner email. */
export async function processWebhook(rt: WhatsAppRuntime, payload: Payload) {
  const gate = mailGate();
  if (!gate || payload.object !== "whatsapp_business_account") return;
  const db = createPublicClient();

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      if (change.field !== "messages" || !value) continue;
      // Deliveries for another number on the same Meta app are ignored.
      if (value.metadata?.phone_number_id && value.metadata.phone_number_id !== rt.settings.phone_number_id) continue;

      for (const s of value.statuses ?? []) {
        if (!s.id || !s.status || !STATUS.has(s.status)) continue;
        const err = s.errors?.[0];
        await db.rpc("whatsapp_status_update", {
          p_gate: gate,
          p_wamid: s.id,
          p_status: s.status,
          p_detail: err ? (err.error_data?.details ?? err.message ?? err.title ?? "") : "",
        });
      }

      for (const m of value.messages ?? []) {
        if (!m.from || !m.id || !/^\d{6,20}$/.test(m.from)) continue;
        const name = value.contacts?.find((c) => c.wa_id === m.from)?.profile?.name ?? "";
        const body = textOf(m);
        const { data } = await db.rpc("whatsapp_log_inbound", {
          p_gate: gate,
          p_wa_id: m.from,
          p_name: name,
          p_wamid: m.id,
          p_type: m.type ?? "text",
          p_body: body,
        });
        const logged = data as { duplicate?: boolean; autoreply?: boolean } | null;
        if (!logged || logged.duplicate) continue;

        const { settings } = rt;
        // A new conversation: the auto-reply is due and the owner hears about it once.
        if (logged.autoreply && settings.enabled) {
          if (settings.autoreply_enabled && settings.autoreply_body.trim()) {
            const text = renderWhatsApp(settings.autoreply_body, await templateVars(name));
            await deliverWhatsApp(rt, { kind: "autoreply", to: m.from, name, text });
          }
          if (settings.notify_email) await notifyOwner(m.from, name, body);
        }
      }
    }
  }
}

async function notifyOwner(waId: string, name: string, body: string) {
  const loaded = await loadMailRuntime();
  if (!loaded.ok) return;
  const { settings } = loaded.runtime;
  const rows: [string, string][] = [
    ["From", name ? `${name} (${formatNumber(waId)})` : formatNumber(waId)],
    ["Message", body],
  ];
  const intro = "A new WhatsApp conversation started. Reply from Admin → WhatsApp or from the WhatsApp Business app.";
  await deliver(loaded.runtime, {
    kind: "notification",
    to: settings.notify_email || settings.from_email,
    subject: `New WhatsApp message from ${name || formatNumber(waId)}`.slice(0, 200),
    text: [intro, "", ...rows.map(([k, v]) => `${k}: ${v}`)].join("\n"),
    html: tableEmailHtml(rows, settings.from_name || "Layò", intro),
  });
}
