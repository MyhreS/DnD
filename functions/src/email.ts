import * as nodemailer from "nodemailer";
import { logger } from "firebase-functions/v2";
import { GMAIL_SENDER, GMAIL_APP_PASSWORD, FROM_NAME } from "./config";

export interface Mail {
  to: string;
  subject: string;
  /** Plain-text body. */
  text: string;
  /** Optional pre-rendered HTML; otherwise generated from `text`. */
  html?: string;
}

function transporter() {
  const user = GMAIL_SENDER.value();
  const pass = GMAIL_APP_PASSWORD.value();
  if (!user || !pass) {
    throw new Error(
      "Email is not configured. Set the GMAIL_APP_PASSWORD secret (and GMAIL_SENDER) — see functions/README.",
    );
  }
  return nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
}

/** Wrap body copy in the app's dark, gothic email shell. */
export function renderHtml(opts: {
  heading: string;
  bodyHtml: string;
  ctaText?: string;
  ctaHref?: string;
}): string {
  const { heading, bodyHtml, ctaText, ctaHref } = opts;
  const button =
    ctaText && ctaHref
      ? `<a href="${ctaHref}" style="display:inline-block;margin:8px 0 4px;padding:14px 26px;background:#b3121a;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;letter-spacing:0.04em;font-family:Georgia,serif">${ctaText}</a>`
      : "";
  return `<!doctype html><html><body style="margin:0;background:#0a0a0c;padding:28px 14px;font-family:Georgia,'Times New Roman',serif;color:#e9e3d5">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table role="presentation" width="100%" style="max-width:480px;background:#131217;border:1px solid rgba(201,164,90,0.18);border-radius:14px;overflow:hidden">
      <tr><td style="padding:26px 26px 8px">
        <div style="font-size:12px;letter-spacing:0.22em;text-transform:uppercase;color:#8a7745">Catacombs &amp; Starspawns</div>
        <h1 style="font-family:Georgia,serif;color:#e9e3d5;font-size:22px;margin:8px 0 14px">${heading}</h1>
        <div style="color:#c8c2b4;font-size:16px;line-height:1.55">${bodyHtml}</div>
        <div style="margin-top:18px">${button}</div>
      </td></tr>
      <tr><td style="padding:14px 26px 24px;border-top:1px solid rgba(201,164,90,0.14);color:#6f6a5e;font-size:12px">
        A private companion for our table. Pray for blood. 🌙
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;
}

export async function sendMail(mail: Mail): Promise<void> {
  const from = `${FROM_NAME} <${GMAIL_SENDER.value()}>`;
  await transporter().sendMail({
    from,
    to: mail.to,
    subject: mail.subject,
    text: mail.text,
    html: mail.html ?? mail.text.replace(/\n/g, "<br>"),
  });
  logger.info("Email sent", { to: mail.to, subject: mail.subject });
}

/** Send to many recipients, tolerating individual failures. */
export async function sendMany(mails: Mail[]): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;
  for (const m of mails) {
    try {
      await sendMail(m);
      sent++;
    } catch (err) {
      failed++;
      logger.error("Email failed", { to: m.to, err: String(err) });
    }
  }
  return { sent, failed };
}
