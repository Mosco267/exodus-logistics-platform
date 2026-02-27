import { Resend } from "resend";
import { renderEmailTemplate } from "@/lib/emailTemplate";

const resend = new Resend(process.env.RESEND_API_KEY);

// ✅ Server should use APP_URL (not PUBLIC_APP_URL)
// NEXT_PUBLIC_APP_URL is optional fallback (useful for local dev).
const APP_URL = (
  process.env.APP_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "https://www.goexoduslogistics.com"
).replace(/\/$/, "");

const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || "support@goexoduslogistics.com";
const RESEND_FROM = process.env.RESEND_FROM || `Exodus Logistics <${SUPPORT_EMAIL}>`;
const SUPPORT_URL =
  process.env.SUPPORT_URL || `mailto:${SUPPORT_EMAIL}?subject=Support%20Request`;

function esc(s: string) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function toText(html: string) {
  return String(html || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * ✅ FIX: this function was missing before (that’s why `sendEmail` was red)
 * Used by sendShipmentCreatedEmail + sendInvoiceStatusEmail
 */
async function sendEmail(to: string, subject: string, html: string) {
  if (!process.env.RESEND_API_KEY) throw new Error("Missing RESEND_API_KEY");

  return resend.emails.send({
    from: RESEND_FROM,
    to,
    subject,
    replyTo: SUPPORT_EMAIL,
    html,
    text: toText(html),
  });
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
 */
export async function sendRestoreEmail(to: string, opts?: { name?: string }) {
  if (!process.env.RESEND_API_KEY) throw new Error("Missing RESEND_API_KEY");

  const name = (opts?.name || "Customer").trim();
  const safeTo = esc(to);

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
    calloutHtml: "If you did not expect this change, contact support immediately.",
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

  const TRACK_URL = `${APP_URL}/en/track?q=${encodeURIComponent(opts.shipmentId)}`;

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

export async function sendInvoiceUpdateEmail(
  to: string,
  opts: { name?: string; shipmentId: string; paid: boolean }
) {
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

export async function sendShipmentCreatedEmail(
  to: string,
  args: {
    name: string;
    receiverName: string;
    shipmentId: string;
    trackingNumber: string;
    viewShipmentUrl: string;
  }
) {
  const subject = `Shipment created: ${args.shipmentId}`;
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5">
      <h2>Shipment Created</h2>
      <p>Hello ${escapeHtml(args.name || "Customer")},</p>
      <p>Your shipment has been created and is being prepared to be shipped to <b>${escapeHtml(args.receiverName)}</b>.</p>
      <p><b>Shipment ID:</b> ${escapeHtml(args.shipmentId)}<br/>
         <b>Tracking:</b> ${escapeHtml(args.trackingNumber)}</p>
      <p>
        <a href="${args.viewShipmentUrl}" style="display:inline-block;padding:12px 16px;background:#2563eb;color:#fff;text-decoration:none;border-radius:10px;">
          View Shipment
        </a>
      </p>
      <p style="color:#6b7280;font-size:12px">Exodus Logistics</p>
    </div>
  `;
  return sendEmail(to, subject, html);
}

export async function sendInvoiceStatusEmail(
  to: string,
  args: {
    name: string;
    shipmentId: string;
    trackingNumber: string;
    paid: boolean;
    viewInvoiceUrl: string;
  }
) {
  const subject = `Invoice ${args.paid ? "Paid" : "Pending"}: ${args.shipmentId}`;
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5">
      <h2>Invoice Status</h2>
      <p>Hello ${escapeHtml(args.name || "Customer")},</p>
      <p>
        The invoice for shipment <b>${escapeHtml(args.shipmentId)}</b> is currently:
        <b style="color:${args.paid ? "#16a34a" : "#d97706"}">${args.paid ? "PAID" : "UNPAID"}</b>.
      </p>
      ${
        args.paid
          ? ""
          : `<p>Please make payment to proceed. You can contact support or open your dashboard to request payment.</p>`
      }
      <p>
        <a href="${args.viewInvoiceUrl}" style="display:inline-block;padding:12px 16px;background:#2563eb;color:#fff;text-decoration:none;border-radius:10px;">
          View Invoice
        </a>
      </p>
      <p style="color:#6b7280;font-size:12px">Exodus Logistics</p>
    </div>
  `;
  return sendEmail(to, subject, html);
}

// small helper (safe)
function escapeHtml(s: string) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export async function sendShipmentIncomingEmail(
  to: string,
  args: {
    name: string;
    senderName: string;
    receiverAddress: string;
    shipmentId: string;
    trackingNumber: string;
    viewShipmentUrl: string;
  }
) {
  if (!process.env.RESEND_API_KEY) throw new Error("Missing RESEND_API_KEY");

  const subject = `Incoming shipment: ${args.shipmentId}`;

  const bodyHtml = `
    <p style="margin:0 0 14px 0;font-size:16px;line-height:24px;color:#111827;">
      Hello ${esc(args.name || "Customer")},
    </p>

    <p style="margin:0 0 14px 0;font-size:16px;line-height:24px;color:#111827;">
      A shipment has been created for you by <strong>${esc(args.senderName || "Sender")}</strong>.
    </p>

    <p style="margin:0 0 18px 0;font-size:16px;line-height:24px;color:#111827;">
      <strong>Delivery address:</strong> ${esc(args.receiverAddress || "your address")}<br/>
      <strong>Shipment ID:</strong> ${esc(args.shipmentId)}<br/>
      <strong>Tracking:</strong> ${esc(args.trackingNumber)}
    </p>

    <p style="margin:0;font-size:15px;color:#6b7280;">
      You can view shipment status anytime using the button below.
    </p>
  `;

  const html = renderEmailTemplate({
    subject,
    title: "A shipment is on the way to you",
    preheader: `Shipment ${args.shipmentId} has been created`,
    bodyHtml,
    button: { text: "View Shipment", href: args.viewShipmentUrl },
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