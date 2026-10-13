// Shared by the server (sending) and the dashboard (live preview). No server-only imports.

import { SITE_URL } from "@/lib/env";

export const TEMPLATE_KEYS = ["enquiry_autoreply", "message_autoreply"] as const;
export type TemplateKey = (typeof TEMPLATE_KEYS)[number];

export const TEMPLATE_VARS = [
  { key: "first_name", label: "First name", sample: "Ada" },
  { key: "name", label: "Full name", sample: "Ada Obi" },
  { key: "service", label: "Their project", sample: "your full-stack web app project" },
  { key: "booking_url", label: "Booking link", sample: "https://cal.com/layo-dbi0rc/30min" },
  { key: "site_name", label: "Your name", sample: "Layò" },
  { key: "site_url", label: "Website", sample: "layothedeveloper.com" },
] as const;

/** The label in each autoresponder's header, so the email says at a glance what it is. */
export const TEMPLATE_LABELS: Record<TemplateKey, string> = {
  enquiry_autoreply: "Enquiry received",
  message_autoreply: "Message received",
};

export type TemplateVars = Partial<Record<(typeof TEMPLATE_VARS)[number]["key"], string>>;

export const SAMPLE_VARS: TemplateVars = Object.fromEntries(TEMPLATE_VARS.map((v) => [v.key, v.sample]));

/**
 * Visitor names go into emails we send to the address they typed, so strip anything that
 * could turn an autoreply into a vehicle for someone else's message: links, domains,
 * email addresses, markup and control characters.
 */
export function safeName(raw: string) {
  const cleaned = raw
    .replace(/[\u0000-\u001f\u007f<>{}[\]\\|`]/g, " ")
    .split(/\s+/)
    .filter((word) => word && !/(:\/\/|www\.|@|\.[a-z]{2,}\b)/i.test(word))
    .join(" ")
    .slice(0, 60)
    .trim();
  return cleaned;
}

export function firstName(raw: string) {
  return safeName(raw).split(" ")[0] || "there";
}

export function renderTemplate(template: string, vars: TemplateVars) {
  return template.replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (_, key: string) => vars[key as keyof TemplateVars] ?? "");
}

export function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

const URL_PATTERN = /(https?:\/\/[^\s<]+[^\s<.,;:!?)\]'"])/g;

function paragraphsToHtml(text: string) {
  return text
    .trim()
    .split(/\n{2,}/)
    .map((block) => {
      const html = escapeHtml(block)
        .replace(URL_PATTERN, (url) => `<a href="${url}" style="${LINK}">${url}</a>`)
        .replace(/\n/g, "<br>");
      return `<p style="margin:0 0 16px">${html}</p>`;
    })
    .join("");
}

// The site's V2 palette, written out (email clients have no CSS variables).
const C = {
  page: "#eef3fb",
  card: "#ffffff",
  line: "#dde6f5",
  ink: "#0b1330",
  muted: "#55617f",
  cobalt: "#2f5bff",
  lime: "#c7f25a",
  limeInk: "#18230a",
  soft: "#f6f9fe",
};
const FONT = "'Archivo',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";
const LINK = `color:${C.cobalt};text-decoration:underline`;
const BUTTON = `display:inline-block;padding:13px 24px;border-radius:999px;background:${C.cobalt};color:#ffffff;font:700 15px/1 ${FONT};text-decoration:none`;

type Layout = {
  brand: string;
  body: string;
  /** Shown under the brand in the footer (the site motto). */
  footer?: string;
  /** What this email is, in the header pill: "Enquiry received", "New message". */
  label?: string;
  /** Emails to visitors say why they got them; notifications to the owner don't. */
  toVisitor?: boolean;
};

/**
 * The branded shell every email uses: a cobalt header with the mark, the name and a lime label;
 * a white card for the message; a quiet footer with the site link. Tables and inline styles only,
 * so it holds together in Gmail, Outlook and Apple Mail.
 */
export function emailLayout({ brand, body, footer, label, toVisitor }: Layout) {
  const site = SITE_URL.replace(/^https?:\/\//, "");
  const pill = label
    ? `<td align="right" class="pill" style="vertical-align:middle;padding-left:12px"><span style="display:inline-block;padding:7px 12px;border-radius:999px;background:${C.lime};color:${C.limeInk};font:700 11px/1 ${FONT};letter-spacing:0.06em;text-transform:uppercase">${escapeHtml(label)}</span></td>`
    : "";
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><style>@media (max-width:480px){.brandcell,.pill{display:block!important;width:auto!important}.pill{display:block!important;width:auto!important;padding:14px 0 0!important;text-align:left!important}.body{padding:24px 20px 8px!important}.foot{padding:18px 20px 20px!important}.head{padding:20px!important}}</style><title>${escapeHtml(label ?? brand)}</title></head>
<body style="margin:0;padding:0;background:${C.page};-webkit-text-size-adjust:100%">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.page}"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;background:${C.card};border:1px solid ${C.line};border-radius:20px;border-collapse:separate;overflow:hidden">
<tr><td class="head" style="padding:22px 28px;background:${C.cobalt};background-image:radial-gradient(120% 140% at 100% 0%,#7cc4ff 0%,rgba(124,196,255,0) 55%);border-radius:19px 19px 0 0">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
<td class="brandcell" style="vertical-align:middle"><table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td style="padding-right:12px;vertical-align:middle"><img src="${SITE_URL}/apple-icon" width="40" height="40" alt="" style="display:block;border:0;border-radius:10px"></td>
<td style="vertical-align:middle;font:700 20px/1.1 ${FONT};letter-spacing:-0.01em;color:#ffffff">${escapeHtml(brand)}<br><span style="font:500 12px/1.4 ${FONT};letter-spacing:0.02em;color:#dbe6ff">${escapeHtml(site)}</span></td>
</tr></table></td>
${pill}
</tr></table></td></tr>
<tr><td class="body" style="padding:32px 32px 16px;font:16px/1.65 ${FONT};color:${C.ink}">${body}</td></tr>
<tr><td class="foot" style="padding:20px 32px 24px;background:${C.soft};border-top:1px solid ${C.line};border-radius:0 0 19px 19px;font:13px/1.55 ${FONT};color:${C.muted}">
<strong style="color:${C.ink}">${escapeHtml(brand)}</strong>${footer ? ` · ${escapeHtml(footer)}` : ""}<br>
<a href="${SITE_URL}" style="color:${C.cobalt};text-decoration:none;font-weight:700">${escapeHtml(site)}</a>
</td></tr>
</table>
${toVisitor ? `<p style="margin:16px 0 0;font:12px/1.5 ${FONT};color:${C.muted}">You're getting this because you got in touch through ${escapeHtml(site)}.</p>` : ""}
</td></tr></table></body></html>`;
}

export function textEmailHtml(text: string, brand: string, options: { footer?: string; label?: string; toVisitor?: boolean } = {}) {
  return emailLayout({ brand, body: paragraphsToHtml(text), ...options });
}

/** The owner's notification: an intro line and the submitted fields as label / value rows. */
export function tableEmailHtml(rows: [string, string][], brand: string, intro: string, label?: string) {
  const cells = rows
    .filter(([, v]) => v)
    .map(
      ([k, v]) =>
        `<tr><td style="padding:10px 16px 10px 0;border-bottom:1px solid ${C.line};color:${C.muted};font-size:13px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;vertical-align:top;white-space:nowrap">${escapeHtml(k)}</td><td style="padding:10px 0;border-bottom:1px solid ${C.line};white-space:pre-wrap">${escapeHtml(v)}</td></tr>`,
    )
    .join("");
  return emailLayout({
    brand,
    label,
    body: `<p style="margin:0 0 16px">${escapeHtml(intro)}</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font:15px/1.5 ${FONT};color:${C.ink}">${cells}</table>`,
  });
}

// ── Autoresponder formats ───────────────────────────────────────────────

export type TemplateFormat = "html" | "text";

/** Tags and attributes an autoresponder may not contain (email clients drop them anyway). */
export function unsafeHtml(html: string) {
  if (/<\s*(script|iframe|object|embed|form|input|button|style|link|meta|base)\b/i.test(html)) {
    return "Scripts, frames, forms and style tags aren't allowed in emails.";
  }
  if (/\son[a-z]+\s*=/i.test(html)) return "Event attributes like onclick aren't allowed in emails.";
  if (/(href|src)\s*=\s*["']?\s*(javascript|data|vbscript):/i.test(html)) return "Links must start with https:// or mailto:.";
  return null;
}

const ENTITIES: Record<string, string> = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&nbsp;": " " };

/** A readable plain-text version of an HTML body, for the text/plain part of the email. */
export function htmlToText(html: string) {
  return html
    // Source line breaks are just spaces in HTML; only tags decide the text layout.
    .replace(/\s+/g, " ")
    .replace(/<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (_, href: string, label: string) => {
      const text = label.replace(/<[^>]+>/g, "").trim();
      const url = href.replace(/^mailto:/i, "");
      return !text || text === url || `https://${text}` === url ? url : `${text} (${url})`;
    })
    .replace(/\s*<br\s*\/?>\s*/gi, "\n")
    .replace(/<li\b[^>]*>/gi, "- ")
    .replace(/<\/li>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|ul|ol|table|tr|blockquote)>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (m) => ENTITIES[m] ?? m)
    .replace(/[ \t]*\n[ \t]*/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Plain text → simple HTML paragraphs (used when switching a template from text to HTML). */
export function textToHtml(text: string) {
  return text
    .trim()
    .split(/\n{2,}/)
    .map((block) => {
      // Only markup characters are escaped, so apostrophes and quotes stay readable in the editor.
      const html = block
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(URL_PATTERN, (url) => `<a href="${url}">${url}</a>`)
        .replace(/\n/g, "<br>\n");
      return `<p>${html}</p>`;
    })
    .join("\n\n");
}

// Inline the few styles email clients need, without overriding styles the author set.
// A link with class="button" becomes a cobalt pill button.
function styleHtml(html: string) {
  return html
    .replace(/<p(?![^>]*\bstyle=)(\s[^>]*)?>/gi, (_, attrs = "") => `<p${attrs} style="margin:0 0 16px">`)
    .replace(/<a(?![^>]*\bstyle=)(?=[^>]*\bclass\s*=\s*["']?button\b)(\s[^>]*)?>/gi, (_, attrs = "") => `<a${attrs} style="${BUTTON}">`)
    .replace(/<a(?![^>]*\bstyle=)(\s[^>]*)?>/gi, (_, attrs = "") => `<a${attrs} style="${LINK}">`)
    .replace(/<(ul|ol)(?![^>]*\bstyle=)(\s[^>]*)?>/gi, (_, tag: string, attrs = "") => `<${tag}${attrs} style="margin:0 0 16px;padding-left:20px">`);
}

/**
 * Renders an autoresponder in either format. Tokens work in both; in HTML, token values are
 * escaped so a visitor's details can never add markup.
 */
export function buildTemplateEmail(
  template: { format: string; subject: string; body: string },
  vars: TemplateVars,
  brand: string,
  footer?: string,
  label?: string,
): { subject: string; text: string; html?: string } {
  const subject = renderTemplate(template.subject, vars).replace(/\s+/g, " ").trim();
  if (template.format === "text") {
    return { subject, text: renderTemplate(template.body, vars) };
  }
  const escaped = Object.fromEntries(Object.entries(vars).map(([k, v]) => [k, escapeHtml(v ?? "")])) as TemplateVars;
  const bodyHtml = renderTemplate(template.body, escaped);
  return {
    subject,
    text: htmlToText(bodyHtml),
    html: emailLayout({ brand, body: styleHtml(bodyHtml), footer, label, toVisitor: true }),
  };
}
