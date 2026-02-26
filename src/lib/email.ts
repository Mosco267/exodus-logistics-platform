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

function toText(html: string) {
  // very small/safe html->text helper for email "text" fallback
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
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
    calloutHtml: "If you believe this was a mistake, you can request a review by contacting support.",
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
    text: toText(html),
  });
}

/**
 * ✅ Updated Restore Email (spam-safer)
 * - Neutral subject (less “security/cta” spam triggers)
 * - No big “Login” button
 * - Includes plain-text fallback
 * - Keeps only a simple support instruction
 */
export async function sendRestoreEmail(to: string, opts?: { name?: string }) {
  if (!process.env.RESEND_API_KEY) throw new Error("Missing RESEND_API_KEY");

  const name = (opts?.name || "Customer").trim();
  const safeTo = esc(to);

  // Neutral subject reduces spam flags
  const subject = "Exodus Logistics: Update on your account";

  const bodyHtml = `
    <p style="margin:0 0 14px 0;font-size:16px;line-height:24px;color:#111827;">
      Hello ${esc(name)},
    </p>

    <p style="margin:0 0 14px 0;font-size:16px;line-height:24px;color:#111827;">
      This is to confirm that access to the Exodus Logistics account associated with
      <strong>${safeTo}</strong> has been restored.
    </p>

    <p style="margin:0 0 14px 0;font-size:16px;line-height:24px;color:#111827;">
      We apologize for any inconvenience this may have caused.
    </p>

    <p style="margin:0 0 18px 0;font-size:16px;line-height:24px;color:#111827;">
      If you experience any issues signing in, please reply to this email or contact our support team.
    </p>
  `;

  const html = renderEmailTemplate({
    subject,
    title: "Account access restored",
    preheader: "Your Exodus Logistics account access has been restored.",
    bodyHtml,
    calloutHtml:
      "If you did not expect this change, contact support immediately.",
    // keep only support button (mailto) — fewer web links = less spam
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
    text: toText(html),
  });
}

/** Updated: deletion email */
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
    text: toText(html),
  });
}
// ✅ Auto emails for shipment updates

export async function sendShipmentStatusEmail(
  to: string,
  opts: { name?: string; shipmentId: string; statusLabel: string }
) {
  if (!process.env.RESEND_API_KEY) throw new Error("Missing RESEND_API_KEY");

  const name = (opts.name || "Customer").trim();
  const safeTo = esc(to);
  const status = String(opts.statusLabel || "").trim();

  const TRACK_URL = `${APP_URL}/en/dashboard/track?q=${encodeURIComponent(
    opts.shipmentId
  )}`;

  // 🔥 Dynamic message + button based on status
  let subject = `Exodus Logistics: Shipment update (${opts.shipmentId})`;
  let title = "Shipment update";
  let bodyMessage = "";
  let buttonText = "Track Shipment";
  let buttonLink = TRACK_URL;

  switch (status.toLowerCase()) {
    case "in transit":
      title = "Shipment in transit";
      bodyMessage = `
        Your shipment <strong>${esc(opts.shipmentId)}</strong> is now
        <strong>In Transit</strong> and moving to its next destination.
      `;
      buttonText = "Track Shipment";
      break;

    case "custom clearance":
      title = "Shipment under customs review";
      bodyMessage = `
        Your shipment <strong>${esc(opts.shipmentId)}</strong> is currently
        undergoing <strong>Custom Clearance</strong>.
      `;
      buttonText = "View Shipment Status";
      break;

    case "delivered":
      title = "Shipment delivered";
      bodyMessage = `
        Your shipment <strong>${esc(opts.shipmentId)}</strong> has been
        <strong>Delivered</strong> successfully.
      `;
      buttonText = "View Delivery Details";
      break;

    case "out for delivery":
      title = "Out for delivery";
      bodyMessage = `
        Your shipment <strong>${esc(opts.shipmentId)}</strong> is now
        <strong>Out for Delivery</strong>.
      `;
      buttonText = "Track Live Delivery";
      break;

    default:
      bodyMessage = `
        Your shipment <strong>${esc(opts.shipmentId)}</strong> status has been updated to
        <strong>${esc(status)}</strong>.
      `;
      buttonText = "View Shipment";
  }

  const bodyHtml = `
    <p style="margin:0 0 14px 0;font-size:16px;line-height:24px;color:#111827;">
      Hello ${esc(name)},
    </p>

    <p style="margin:0 0 18px 0;font-size:16px;line-height:24px;color:#111827;">
      ${bodyMessage}
    </p>

    <p style="margin:0;font-size:15px;color:#6b7280;">
      If you have any questions, our support team is ready to assist you.
    </p>
  `;

  const html = renderEmailTemplate({
    subject,
    title,
    preheader: `${status} – Shipment ${opts.shipmentId}`,
    bodyHtml,
    button: { text: buttonText, href: buttonLink },
    appUrl: APP_URL,
    supportEmail: SUPPORT_EMAIL,
    sentTo: safeTo,
  });

  return resend.emails.send({
    from: RESEND_FROM,
    to,
    subject,
    replyTo: SUPPORT_EMAIL,
    html,
    text: toText(html),
  });
}
export async function sendInvoiceUpdateEmail(to: string, opts: { name?: string; shipmentId: string; paid: boolean }) {
  if (!process.env.RESEND_API_KEY) throw new Error("Missing RESEND_API_KEY");

  const name = (opts.name || "Customer").trim();
  const safeTo = esc(to);

  const subject = `Exodus Logistics: Invoice update (${opts.shipmentId})`;

  const bodyHtml = `
    <p style="margin:0 0 14px 0;font-size:16px;line-height:24px;color:#111827;">
      Hello ${esc(name)},
    </p>

    <p style="margin:0 0 14px 0;font-size:16px;line-height:24px;color:#111827;">
      The invoice for shipment <strong>${esc(opts.shipmentId)}</strong> is now marked as
      <strong>${opts.paid ? "PAID" : "UNPAID"}</strong>.
    </p>

    <p style="margin:0 0 18px 0;font-size:16px;line-height:24px;color:#111827;">
      If you believe this is incorrect, please contact support.
    </p>
  `;

  const html = renderEmailTemplate({
    subject,
    title: "Invoice updated",
    preheader: `Invoice for ${opts.shipmentId} is now ${opts.paid ? "PAID" : "UNPAID"}.`,
    bodyHtml,
    button: { text: "Contact support", href: SUPPORT_URL },
    appUrl: APP_URL,
    supportEmail: SUPPORT_EMAIL,
    sentTo: safeTo,
  });

  return resend.emails.send({
    from: RESEND_FROM,
    to,
    subject,
    replyTo: SUPPORT_EMAIL,
    html,
    text: toText(html),
  });
}