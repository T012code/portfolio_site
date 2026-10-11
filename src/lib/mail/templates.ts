// Shared by the server (sending) and the dashboard (live preview). No server-only imports.

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
        .replace(URL_PATTERN, (url) => `<a href="${url}" style="color:#262222">${url}</a>`)
        .replace(/\n/g, "<br>");
      return `<p style="margin:0 0 16px">${html}</p>`;
    })
    .join("");
}

const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";

/** A plain, light layout that renders the same in Gmail, Outlook and Apple Mail. */
export function emailLayout({ brand, body, footer }: { brand: string; body: string; footer?: string }) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"></head>
<body style="margin:0;padding:0;background:#f4f2ef">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f2ef"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e3dfda">
<tr><td style="padding:28px 32px 4px;font:700 17px/1.2 ${FONT};letter-spacing:0.02em;color:#262222">${escapeHtml(brand)}</td></tr>
<tr><td style="padding:16px 32px 12px;font:16px/1.6 ${FONT};color:#262222">${body}</td></tr>
${footer ? `<tr><td style="padding:16px 32px;border-top:1px solid #e3dfda;font:12px/1.5 ${FONT};color:#706c68">${escapeHtml(footer)}</td></tr>` : ""}
</table></td></tr></table></body></html>`;
}

export function textEmailHtml(text: string, brand: string, footer?: string) {
  return emailLayout({ brand, body: paragraphsToHtml(text), footer });
}

export function tableEmailHtml(rows: [string, string][], brand: string, intro: string) {
  const cells = rows
    .filter(([, v]) => v)
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 16px 6px 0;color:#706c68;vertical-align:top;white-space:nowrap">${escapeHtml(k)}</td><td style="padding:6px 0;white-space:pre-wrap">${escapeHtml(v)}</td></tr>`,
    )
    .join("");
  return emailLayout({
    brand,
    body: `<p style="margin:0 0 16px">${escapeHtml(intro)}</p><table role="presentation" cellpadding="0" cellspacing="0" style="font:15px/1.5 ${FONT};color:#262222">${cells}</table>`,
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
function styleHtml(html: string) {
  return html
    .replace(/<p(?![^>]*\bstyle=)(\s[^>]*)?>/gi, (_, attrs = "") => `<p${attrs} style="margin:0 0 16px">`)
    .replace(/<a(?![^>]*\bstyle=)(\s[^>]*)?>/gi, (_, attrs = "") => `<a${attrs} style="color:#262222">`)
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
    html: emailLayout({ brand, body: styleHtml(bodyHtml), footer }),
  };
}
