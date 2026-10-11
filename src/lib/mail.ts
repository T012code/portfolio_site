import "server-only";
import nodemailer from "nodemailer";

// Zoho Mail over SMTP. Until SMTP_* is set (in Vercel), email is skipped and
// submissions still land in the admin inbox.
function transport() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASSWORD) return null;
  const port = Number(SMTP_PORT ?? 465);
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
  });
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function table(rows: [string, string][]) {
  return `<table cellpadding="6" style="border-collapse:collapse;font:14px/1.5 -apple-system,Segoe UI,sans-serif">${rows
    .filter(([, v]) => v)
    .map(
      ([k, v]) =>
        `<tr><td style="color:#706c68;vertical-align:top;white-space:nowrap">${escapeHtml(k)}</td><td style="white-space:pre-wrap">${escapeHtml(v)}</td></tr>`,
    )
    .join("")}</table>`;
}

type Mail = { replyTo: string; subject: string; rows: [string, string][] };

// Only the site owner is emailed. No auto-reply goes to the submitted address: that would
// let anyone send mail from this domain to arbitrary people with text they control.
export async function sendSubmissionEmails(mail: Mail) {
  const smtp = transport();
  if (!smtp) return { sent: false as const, reason: "not-configured" };
  const plain = mail.rows.filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join("\n");
  try {
    await smtp.sendMail({
      from: `Layò website <${process.env.SMTP_USER}>`,
      to: process.env.NOTIFY_EMAIL || process.env.SMTP_USER!,
      replyTo: mail.replyTo,
      subject: mail.subject,
      text: plain,
      html: table(mail.rows),
    });
    return { sent: true as const };
  } catch (error) {
    console.error("Email failed", error);
    return { sent: false as const, reason: "error" };
  }
}
