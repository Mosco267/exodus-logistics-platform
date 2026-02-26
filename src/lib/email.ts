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

/** Simple enterprise-style case/reference id */
function makeCaseId(prefix = "EX") {
  const dt = new Date();
  const y = String(dt.getFullYear());
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const d = String(dt.getDate()).padStart(2, "0");
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}-${y}${m}${d}-${rand}`;
}

function caseLine(caseId: string) {
  return `
    <p style="margin:0 0 16px 0;font-size:13px;line-height:20px;color:#374151;">
      Reference ID: <span style="font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono','Courier New',monospace;font-weight:800;color:#111827;">
        ${esc(caseId)}
      </span>
    </p>
  `;
}

function brandFooterLine() {
  // Branded footer feel without address
  const site = APP_URL;
  return `
    <p style="margin:18px 0 0 0;font-size:13px;line-height:20px;color:#6b7280;">
      Need assistance? Contact our support team at
      <a href="mailto:${esc(SUPPORT_EMAIL)}" style="color:#2563eb;text-decoration:none;font-weight:700;">
        ${esc(SUPPORT_EMAIL)}
      </a>
      or visit
      <a href="${esc(site)}" style="color:#2563eb;text-decoration:none;font-weight:700;">
        ${esc(site.replace(/^https?:\/\//, ""))}
      </a>.
    </p>
  `;
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

    ${brandFooterLine()}
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

/** UPDATED: restore email (more enterprise + apology + need help + case id) */
export async function sendRestoreEmail(
  to: string,
  opts?: { name?: string; caseId?: string }
) {
  if (!process.env.RESEND_API_KEY) throw new Error("Missing RESEND_API_KEY");

  const name = (opts?.name || "Customer").trim();
  const safeTo = esc(to);
  const ref = (opts?.caseId || makeCaseId("EX-RESTORE")).trim();

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
      Our systems are designed to protect account integrity and platform security, and occasionally additional review is required.
    </p>

    <p style="margin:0 0 14px 0;font-size:16px;line-height:24px;color:#111827;">
      You may now log in and continue managing your shipments, invoices, and tracking updates without interruption.
    </p>

    ${caseLine(ref)}

    <p style="margin:0 0 6px 0;font-size:15px;line-height:22px;color:#111827;font-weight:800;">
      Need help?
    </p>
    <p style="margin:0 0 18px 0;font-size:15px;line-height:22px;color:#111827;">
      If you have any questions or experience any issues signing in, our support team is ready to help.
      Please contact us and include your reference ID above so we can assist faster.
    </p>

    ${brandFooterLine()}
  `;

  const html = renderEmailTemplate({
    subject,
    title: "Account Access Restored",
    preheader: "Your Exodus Logistics account access has been restored.",
    bodyHtml,
    calloutHtml:
      "If you did not expect this change or believe your account security may have been compromised, please contact support immediately.",
    button: {
      text: "Login to Your Account",
      href: `${APP_URL}/en/sign-in`,
    },
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

/** Deletion email (now includes case/reference id) */
export async function sendDeletedByAdminEmail(
  to: string,
  opts?: { name?: string; caseId?: string }
) {
  if (!process.env.RESEND_API_KEY) throw new Error("Missing RESEND_API_KEY");

  const name = (opts?.name || "Customer").trim();
  const safeTo = esc(to);
  const ref = (opts?.caseId || makeCaseId("EX-DELETE")).trim();

  const subject = "Exodus Logistics: Account deleted";

  const bodyHtml = `
    <p style="margin:0 0 14px 0;font-size:16px;line-height:24px;color:#111827;">
      Hello ${esc(name)},
    </p>

    <p style="margin:0 0 14px 0;font-size:16px;line-height:24px;color:#111827;">
      This email confirms that the Exodus Logistics account associated with
      <strong>${safeTo}</strong> has been deleted by an administrator.
    </p>

    <p style="margin:0 0 14px 0;font-size:16px;line-height:24px;color:#111827;">
      If you believe this was done in error, please contact support for assistance.
      When contacting support, include the reference ID below for faster review.
    </p>

    ${caseLine(ref)}

    ${brandFooterLine()}
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