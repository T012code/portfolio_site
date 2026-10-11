// Shared by the server (sending) and the dashboard (live preview). No server-only imports.

export const TEMPLATE_KEYS = ["enquiry_autoreply", "message_autoreply"] as const;
export type TemplateKey = (typeof TEMPLATE_KEYS)[number];

export const TEMPLATE_VARS = [
  { key: "first_name", label: "First name", sample: "Ada" },
  { key: "name", label: "Full name", sample: "Ada Obi" },
  { key: "service", label: "Their project", sample: "your full-stack web app project" },
  { key: "booking_url", label: "Booking link", sample: "https://cal.com/layo-dbi0rc/30min" },
  { key: "site_name", label: "Your name", sample: "Layò" },
  { key: "site_url", label: "Website", sample: "https://layothedeveloper.com" },
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
