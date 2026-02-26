import { Resend } from "resend";
import { renderEmailTemplate } from "@/lib/emailTemplate";

const resend = new Resend(process.env.RESEND_API_KEY);

const APP_URL = (process.env.PUBLIC_APP_URL || "https://goexoduslogistics.com").replace(/\/$/, "");
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || "support@goexoduslogistics.com";
const RESEND_FROM = process.env.RESEND_FROM || `Exodus Logistics <${SUPPORT_EMAIL}>`;
const SUPPORT_URL =
  process.env.SUPPORT_URL || `mailto:${SUPPORT_EMAIL}?subject=Support%20Request`;

function esc(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/** Existing: ban email */
export async function sendBanEmail(to: string, opts?: { name?: string }) {
  if (!process.env.RESEND_API_KEY) throw new Error("Missing RESEND_API_KEY");

  const name = (opts?.name || "Customer").trim();
  const safeTo = esc(to);

  const subject = "Exodus Logistics: Account access removed";

  const bodyHtml = `
    <p style="margin:0 0 14px 0;font-size:16px;line-height:24px;color:#111827;">
      Hello ${esc(name)},
    </p>

    <p style="margin:0 0 14px 0;font-size:16px;line-height:24px;color:#111827;">
      This email confirms that the Exodus Logistics account associated with
      <strong>${safeTo}</strong> has been permanently banned due to a violation of our policies.
    </p>

    <p style="margin:0 0 18px 0;font-size:16px;line-height:24px;color:#111827;">
      Access has been removed, and you will not be able to register another account using this email address.
    </p>
  `;

  const html = renderEmailTemplate({
    subject,
    title: "Account access removed",
    preheader: "Your account access has been removed. Contact support if you believe this was a mistake.",
    bodyHtml,
    calloutHtml:
      "If you believe this was a mistake, you can request a review by contacting support.",
    button: { text: "Contact support", href: SUPPORT_URL },
    appUrl: APP_URL,
    supportEmail: SUPPORT_EMAIL,
    sentTo: to,
  });

  return resend.emails.send({
    from: RESEND_FROM,
    to,
    subject,
    replyTo: SUPPORT_EMAIL,
    html,
  });
}

/** Updated: restore email (clean + professional, no reference/need-help block) */
export async function sendRestoreEmail(to: string, opts?: { name?: string }) {
  if (!process.env.RESEND_API_KEY) throw new Error("Missing RESEND_API_KEY");

  const name = (opts?.name || "Customer").trim();
  const safeTo = esc(to);

  const subject = "Access Restored – Your Exodus Logistics Account";

  const bodyHtml = `
    <p style="margin:0 0 14px 0;font-size:16px;line-height:24px;color:#111827;">
      Hello ${esc(name)},
    </p>

    <p style="margin:0 0 14px 0;font-size:16px;line-height:24px;color:#111827;">
      We’re pleased to inform you that your Exodus Logistics account associated with
      <strong>${safeTo}</strong> has been successfully restored.
    </p>

    <p style="margin:0 0 14px 0;font-size:16px;line-height:24px;color:#111827;">
      If your access was previously restricted, we sincerely apologize for any inconvenience this may have caused.
      Our systems are designed to maintain platform integrity and protect all users.
    </p>

    <p style="margin:0 0 18px 0;font-size:16px;line-height:24px;color:#111827;">
      You may now log in and continue managing your shipments and tracking updates without interruption.
    </p>
  `;

  const html = renderEmailTemplate({
    subject,
    title: "Account Access Restored",
    preheader: "Your Exodus Logistics account access has been restored.",
    bodyHtml,
    calloutHtml:
      "If you did not expect this change or believe your account security may have been compromised, please contact support immediately.",
    button: { text: "Login to Your Account", href: `${APP_URL}/en/sign-in` },
    appUrl: APP_URL,
    supportEmail: SUPPORT_EMAIL,
    sentTo: to,
  });

  return resend.emails.send({
    from: RESEND_FROM,
    to,
    subject,
    replyTo: SUPPORT_EMAIL,
    html,
  });
}

/** Updated: deletion email (removed extra “Need assistance…” line) */
export async function sendDeletedByAdminEmail(to: string, opts?: { name?: string }) {
  if (!process.env.RESEND_API_KEY) throw new Error("Missing RESEND_API_KEY");

  const name = (opts?.name || "Customer").trim();
  const safeTo = esc(to);

  const subject = "Exodus Logistics: Account deleted";

  const bodyHtml = `
    <p style="margin:0 0 14px 0;font-size:16px;line-height:24px;color:#111827;">
      Hello ${esc(name)},
    </p>

    <p style="margin:0 0 14px 0;font-size:16px;line-height:24px;color:#111827;">
      This email confirms that the Exodus Logistics account associated with
      <strong>${safeTo}</strong> has been deleted by an administrator.
    </p>

    <p style="margin:0 0 18px 0;font-size:16px;line-height:24px;color:#111827;">
      If you believe this action was taken in error, please contact our support team for assistance.
    </p>
  `;

  const html = renderEmailTemplate({
    subject,
    title: "Account deleted",
    preheader: "Your account has been deleted. Contact support if you believe this was a mistake.",
    bodyHtml,
    calloutHtml: "If you believe this was a mistake, contact support and we will review it.",
    button: { text: "Contact support", href: SUPPORT_URL },
    appUrl: APP_URL,
    supportEmail: SUPPORT_EMAIL,
    sentTo: to,
  });

  return resend.emails.send({
    from: RESEND_FROM,
    to,
    subject,
    replyTo: SUPPORT_EMAIL,
    html,
  });
}