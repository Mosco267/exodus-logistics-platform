import { Resend } from "resend";
import { renderEmailTemplate } from "@/lib/emailTemplate";

const resend = new Resend(process.env.RESEND_API_KEY);

// ✅ Server should use APP_URL (not PUBLIC_APP_URL)
const APP_URL = (
  process.env.APP_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "https://www.goexoduslogistics.com"
).replace(/\/$/, "");

const DEFAULT_LOCALE = process.env.DEFAULT_LOCALE || "en";

const SUPPORT_EMAIL =
  process.env.SUPPORT_EMAIL || "support@goexoduslogistics.com";
const RESEND_FROM =
  process.env.RESEND_FROM || `Exodus Logistics <${SUPPORT_EMAIL}>`;
const SUPPORT_URL =
  process.env.SUPPORT_URL ||
  `mailto:${SUPPORT_EMAIL}?subject=Support%20Request`;

type InvoiceStatus = "paid" | "unpaid" | "overdue" | "cancelled";

/** -------------------------
 * Helpers
 * ------------------------- */
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

function cleanStr(v: any) {
  const s = String(v ?? "").trim();
  return s || "";
}

function normUpper(v: any) {
  return cleanStr(v).toUpperCase();
}

function normalizeInvoiceStatus(v: any): InvoiceStatus {
  const s = cleanStr(v).toLowerCase();
  if (s === "paid") return "paid";
  if (s === "overdue") return "overdue";
  if (s === "cancelled" || s === "canceled") return "cancelled";
  return "unpaid";
}

function invoiceStatusLabel(status: InvoiceStatus) {
  if (status === "paid") return "PAID";
  if (status === "overdue") return "OVERDUE";
  if (status === "cancelled") return "CANCELLED";
  return "UNPAID";
}

function invoiceStatusSubject(status: InvoiceStatus) {
  if (status === "paid") return "Paid";
  if (status === "overdue") return "Overdue";
  if (status === "cancelled") return "Cancelled";
  return "Unpaid";
}

function invoiceStatusMessage(status: InvoiceStatus) {
  if (status === "paid") {
    return "Payment has been confirmed in our system and the shipment can continue to the next stage.";
  }
  if (status === "overdue") {
    return "This invoice is now overdue. Please arrange payment as soon as possible to avoid further processing delays.";
  }
  if (status === "cancelled") {
    return "This invoice has been cancelled. If you believe this was done in error, please contact support.";
  }
  return "This invoice is currently unpaid. Please complete payment to allow shipment processing to continue.";
}

function formatAddress(parts: Array<any>) {
  return parts
    .map((x) => String(x || "").trim())
    .filter(Boolean)
    .join(", ");
}

function formatChangedFields(changes: Array<{ label: string; oldValue?: any; newValue?: any }>) {
  const rows = changes
    .filter((c) => cleanStr(c.newValue))
    .map((c) => {
      const oldVal = cleanStr(c.oldValue) || "—";
      const newVal = cleanStr(c.newValue) || "—";
      return `
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-size:14px;color:#111827;font-weight:600;vertical-align:top;">
            ${esc(c.label)}
          </td>
          <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-size:14px;color:#6b7280;vertical-align:top;">
            ${esc(oldVal)}
          </td>
          <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-size:14px;color:#111827;vertical-align:top;">
            ${esc(newVal)}
          </td>
        </tr>
      `;
    })
    .join("");

  if (!rows) return "";

  return `
    <div style="margin:16px 0 0 0;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;background:#ffffff;">
        <thead>
          <tr style="background:#f9fafb;">
            <th align="left" style="padding:10px 12px;font-size:13px;color:#374151;border-bottom:1px solid #e5e7eb;">Field</th>
            <th align="left" style="padding:10px 12px;font-size:13px;color:#374151;border-bottom:1px solid #e5e7eb;">Previous</th>
            <th align="left" style="padding:10px 12px;font-size:13px;color:#374151;border-bottom:1px solid #e5e7eb;">Updated</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  `;
}

/**
 * ✅ Invoice number format:
 * EXS-INV-YYYY-MM-1234567
 *
 * - If invoiceNumber is passed from DB, we use it.
 * - If not, we generate a deterministic fallback using shipmentId + trackingNumber.
 */
function makeInvoiceNumber(args: {
  shipmentId?: string;
  trackingNumber?: string;
  invoiceNumber?: string;
}) {
  const existing = normUpper(args.invoiceNumber);
  if (existing) return existing;

  const now = new Date();
  const yyyy = String(now.getFullYear());
  const mm = String(now.getMonth() + 1).padStart(2, "0");

  const seed = `${cleanStr(args.shipmentId)}::${cleanStr(args.trackingNumber)}`;
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const seven = String((h % 9000000) + 1000000); // 7 digits

  return `EXS-INV-${yyyy}-${mm}-${seven}`;
}

/**
 * ✅ Direct route (NO redirect hop): /{locale}/track/[q]
 */
function buildTrackUrl(q: string, locale = DEFAULT_LOCALE) {
  const qq = normUpper(q);
  return `${APP_URL}/${locale}/track/${encodeURIComponent(qq)}`;
}

/**
 * ✅ Invoice FULL page route
 */
function buildInvoiceFullUrlByQ(q: string, locale = DEFAULT_LOCALE) {
  const qq = normUpper(q);
  return `${APP_URL}/${locale}/invoice/full?q=${encodeURIComponent(qq)}`;
}

function invoiceSearchUrl(locale = DEFAULT_LOCALE) {
  return `${APP_URL}/${locale}/invoice`;
}

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

function escapeHtml(s: string) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatEstimatedDeliveryDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";

  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}


/** -------------------------
 * Shipment Created - Sender
 * ------------------------- */
export async function sendShipmentCreatedSenderEmail(
  to: string,
  args: {
    name: string;
    receiverName: string;
    shipmentId: string;
    trackingNumber: string;
    paid: boolean;
    invoiceNumber?: string;
    estimatedDeliveryDate?: string | null;
    locale?: string;
    viewInvoiceUrl?: string;
  }
) {
  if (!process.env.RESEND_API_KEY) throw new Error("Missing RESEND_API_KEY");

  const name = (args.name || "Customer").trim();
  const receiverName = (args.receiverName || "Receiver").trim();
  const paid = Boolean(args.paid);
  const locale = args.locale || DEFAULT_LOCALE;

  const trackingOrShip = args.trackingNumber || args.shipmentId;

  const invoiceNumber = makeInvoiceNumber({
    shipmentId: args.shipmentId,
    trackingNumber: args.trackingNumber,
    invoiceNumber: args.invoiceNumber,
  });

  const trackUrl = buildTrackUrl(trackingOrShip, locale);
  const invoiceUrl =
    args.viewInvoiceUrl || buildInvoiceFullUrlByQ(trackingOrShip, locale);

  const subject = paid
    ? `Shipment created: ${args.shipmentId}`
    : `Action required: Payment needed for shipment ${args.shipmentId}`;

  const estimatedDeliveryText = formatEstimatedDeliveryDate(args.estimatedDeliveryDate);

const bodyHtml = `
  <p style="margin:0 0 14px 0;font-size:16px;line-height:24px;color:#111827;">
    Hello ${esc(name)},
  </p>

  <p style="margin:0 0 14px 0;font-size:16px;line-height:24px;color:#111827;">
    Your shipment <strong>${esc(args.shipmentId)}</strong> has been created successfully and is being prepared for delivery to
    <strong>${esc(receiverName)}</strong>.
  </p>

  <p style="margin:0 0 18px 0;font-size:16px;line-height:24px;color:#111827;">
    <strong>Invoice status:</strong> ${paid ? "<strong>PAID</strong>" : "<strong>UNPAID</strong>"}<br/>
    <strong>Estimated delivery date:</strong> ${esc(estimatedDeliveryText)}<br/>
    ${
      paid
        ? "We will move your shipment to the next stage shortly and keep you updated."
        : "Please complete payment so we can move your shipment to the next stage of processing."
    }
  </p>

  <div style="margin:0 0 18px 0;padding:14px 16px;border:1px solid #e5e7eb;border-radius:12px;background:#f9fafb;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
      <tr>
        <td style="padding:0 0 10px 0;font-size:14px;color:#6b7280;font-weight:600;">Shipment ID</td>
        <td style="padding:0 0 10px 16px;font-size:15px;color:#111827;font-weight:700;">${esc(args.shipmentId)}</td>
      </tr>
      <tr>
        <td style="padding:0 0 10px 0;font-size:14px;color:#6b7280;font-weight:600;">Tracking number</td>
        <td style="padding:0 0 10px 16px;font-size:15px;color:#111827;font-weight:700;">${esc(args.trackingNumber)}</td>
      </tr>
      <tr>
        <td style="padding:0;font-size:14px;color:#6b7280;font-weight:600;">Invoice number</td>
        <td style="padding:0 0 0 16px;font-size:15px;color:#111827;font-weight:700;">${esc(invoiceNumber)}</td>
      </tr>
    </table>

    <p style="margin:12px 0 0 0;font-size:12px;color:#6b7280;">
      Tip: Save these details for verification on our official website.
    </p>
  </div>

  <p style="margin:0;font-size:15px;color:#6b7280;">
    You can view shipment status or open your invoice using the buttons below.
  </p>

  <div style="margin-top:12px">
    <a href="${invoiceUrl}" style="color:#2563eb;text-decoration:underline;font-weight:600;">
      View Invoice
    </a>
  </div>
`;

  const html = renderEmailTemplate({
    subject,
    title: paid ? "Shipment created" : "Payment required",
    preheader: paid
      ? `Shipment ${args.shipmentId} created (Paid)`
      : `Shipment ${args.shipmentId} created (Unpaid)`,
    bodyHtml,
    button: { text: "View Shipment", href: trackUrl },
    appUrl: APP_URL,
    supportEmail: SUPPORT_EMAIL,
    sentTo: to,
  });

  return sendEmail(to, subject, html);
}

/** -------------------------
 * Shipment Created - Receiver
 * ------------------------- */
export async function sendShipmentCreatedReceiverEmailV2(
  to: string,
  args: {
    name: string;
    senderName: string;
    shipmentId: string;
    trackingNumber: string;
    paid: boolean;
    invoiceNumber?: string;
    estimatedDeliveryDate?: string | null;
    locale?: string;
    viewInvoiceUrl?: string;
  }
) {
  if (!process.env.RESEND_API_KEY) throw new Error("Missing RESEND_API_KEY");

  const name = (args.name || "Customer").trim();
  const senderName = (args.senderName || "Sender").trim();
  const paid = Boolean(args.paid);
  const locale = args.locale || DEFAULT_LOCALE;

  const trackingOrShip = args.trackingNumber || args.shipmentId;

  const invoiceNumber = makeInvoiceNumber({
    shipmentId: args.shipmentId,
    trackingNumber: args.trackingNumber,
    invoiceNumber: args.invoiceNumber,
  });

  const trackUrl = buildTrackUrl(trackingOrShip, locale);
  const invoiceUrl =
    args.viewInvoiceUrl || buildInvoiceFullUrlByQ(trackingOrShip, locale);

  const subject = paid
    ? `Shipment on the way: ${args.shipmentId}`
    : `Shipment created for you: ${args.shipmentId} (Payment pending)`;

  const estimatedDeliveryText = formatEstimatedDeliveryDate(args.estimatedDeliveryDate);

const bodyHtml = `
  <p style="margin:0 0 14px 0;font-size:16px;line-height:24px;color:#111827;">
    Hello ${esc(name)},
  </p>

  <p style="margin:0 0 14px 0;font-size:16px;line-height:24px;color:#111827;">
    A shipment has been created for you by <strong>${esc(senderName)}</strong>.
  </p>

  <p style="margin:0 0 18px 0;font-size:16px;line-height:24px;color:#111827;">
    <strong>Invoice status:</strong> ${paid ? "<strong>PAID</strong>" : "<strong>UNPAID</strong>"}<br/>
    <strong>Estimated delivery date:</strong> ${esc(estimatedDeliveryText)}<br/>
    ${
      paid
        ? "Your shipment is being prepared for dispatch and will move to the next stage shortly."
        : "Once payment is completed, the shipment will move to the next stage and you will receive updates."
    }
  </p>

  <div style="margin:0 0 18px 0;padding:14px 16px;border:1px solid #e5e7eb;border-radius:12px;background:#f9fafb;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
      <tr>
        <td style="padding:0 0 10px 0;font-size:14px;color:#6b7280;font-weight:600;">Shipment ID</td>
        <td style="padding:0 0 10px 16px;font-size:15px;color:#111827;font-weight:700;">${esc(args.shipmentId)}</td>
      </tr>
      <tr>
        <td style="padding:0 0 10px 0;font-size:14px;color:#6b7280;font-weight:600;">Tracking number</td>
        <td style="padding:0 0 10px 16px;font-size:15px;color:#111827;font-weight:700;">${esc(args.trackingNumber)}</td>
      </tr>
      <tr>
        <td style="padding:0;font-size:14px;color:#6b7280;font-weight:600;">Invoice number</td>
        <td style="padding:0 0 0 16px;font-size:15px;color:#111827;font-weight:700;">${esc(invoiceNumber)}</td>
      </tr>
    </table>
  </div>

  <div style="margin-top:12px">
    <a href="${invoiceUrl}" style="color:#2563eb;text-decoration:underline;font-weight:600;">
      View Invoice
    </a>
  </div>
`;

  const html = renderEmailTemplate({
    subject,
    title: "Shipment created",
    preheader: paid
      ? `Shipment ${args.shipmentId} created (Paid)`
      : `Shipment ${args.shipmentId} created (Unpaid)`,
    bodyHtml,
    button: { text: "View Shipment", href: trackUrl },
    appUrl: APP_URL,
    supportEmail: SUPPORT_EMAIL,
    sentTo: to,
  });

  return sendEmail(to, subject, html);
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
    preheader:
      "Your account access has been removed. Contact support if you believe this was a mistake.",
    bodyHtml,
    calloutHtml:
      "If you believe this was a mistake, you can request a review by contacting support.",
    button: { text: "Contact support", href: SUPPORT_URL },
    appUrl: APP_URL,
    supportEmail: SUPPORT_EMAIL,
    sentTo: to,
  });

  return sendEmail(to, subject, html);
}

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

  return sendEmail(to, subject, html);
}

export async function sendDeletedByAdminEmail(
  to: string,
  opts?: { name?: string }
) {
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
    preheader:
      "Your account has been deleted. Contact support if you believe this was a mistake.",
    bodyHtml,
    calloutHtml:
      "If you believe this was a mistake, contact support and we will review it.",
    button: { text: "Contact support", href: SUPPORT_URL },
    appUrl: APP_URL,
    supportEmail: SUPPORT_EMAIL,
    sentTo: to,
  });

  return sendEmail(to, subject, html);
}

function formatEmailDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";

  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ✅ Auto emails for shipment updates
export async function sendShipmentStatusEmail(
  to: string,
  opts: {
    name?: string;
    shipmentId: string;
    statusLabel: string;
    trackingNumber?: string;
    invoiceNumber?: string;
    destination?: string;
    origin?: string;
    note?: string;
    estimatedDeliveryDate?: string | null;
    locale?: string;
  }
) {
  if (!process.env.RESEND_API_KEY) throw new Error("Missing RESEND_API_KEY");

  const name = (opts.name || "Customer").trim();
const status = String(opts.statusLabel || "").trim();
const locale = opts.locale || DEFAULT_LOCALE;

const q = opts.trackingNumber || opts.shipmentId;
const TRACK_URL = buildTrackUrl(q, locale);
const INVOICE_URL = buildInvoiceFullUrlByQ(q, locale);

const invoiceNumber = makeInvoiceNumber({
  shipmentId: opts.shipmentId,
  trackingNumber: opts.trackingNumber,
  invoiceNumber: opts.invoiceNumber,
});

const destination = cleanStr(opts.destination) || "the destination address on file";
const origin = cleanStr(opts.origin) || "origin facility";
const note = cleanStr(opts.note);
const estimatedDelivery = formatEmailDate(opts.estimatedDeliveryDate);

let subject = `Exodus Logistics: Shipment update (${opts.shipmentId})`;
let title = "Shipment update";
let buttonText = "Track Shipment";
let buttonLink = TRACK_URL;
let intro = "";
let detail = "";

switch (status.toLowerCase()) {
  case "pickup":
    title = "Shipment picked up";
    subject = `Exodus Logistics: Shipment picked up (${opts.shipmentId})`;
    intro = `We are pleased to inform you that your shipment <strong>${esc(opts.shipmentId)}</strong> has been successfully picked up and entered into our logistics network.`;
    detail = `The shipment is now being processed for movement from <strong>${esc(origin)}</strong> toward <strong>${esc(destination)}</strong>.`;
    break;

  case "warehouse":
    title = "Shipment received at warehouse";
    subject = `Exodus Logistics: Shipment received at warehouse (${opts.shipmentId})`;
    intro = `Your shipment <strong>${esc(opts.shipmentId)}</strong> has been received at our warehouse facility.`;
    detail = `It is currently undergoing internal handling and preparation before moving to the next shipping stage toward <strong>${esc(destination)}</strong>.`;
    break;

  case "in transit":
    title = "Shipment in transit";
    subject = `Exodus Logistics: Shipment in transit (${opts.shipmentId})`;
    intro = `Your shipment <strong>${esc(opts.shipmentId)}</strong> is now <strong>in transit</strong>.`;
    detail = `It is currently moving toward <strong>${esc(destination)}</strong> from <strong>${esc(origin)}</strong>.`;
    break;

  case "out for delivery":
    title = "Shipment out for delivery";
    subject = `Exodus Logistics: Out for delivery (${opts.shipmentId})`;
    intro = `Your shipment <strong>${esc(opts.shipmentId)}</strong> is now <strong>out for delivery</strong>.`;
    detail = `Our delivery process is in progress and the shipment is on its final route toward <strong>${esc(destination)}</strong>.`;
    buttonText = "Track Delivery";
    break;

  case "delivered":
    title = "Shipment delivered";
    subject = `Exodus Logistics: Shipment delivered (${opts.shipmentId})`;
    intro = `This is to confirm that your shipment <strong>${esc(opts.shipmentId)}</strong> has been successfully <strong>delivered</strong>.`;
    detail = `Delivery has been completed at <strong>${esc(destination)}</strong>.`;
    buttonText = "View Shipment";
    break;

  case "cancelled":
  case "canceled":
    title = "Shipment cancelled";
    subject = `Exodus Logistics: Shipment cancelled (${opts.shipmentId})`;
    intro = `Your shipment <strong>${esc(opts.shipmentId)}</strong> has been marked as <strong>cancelled</strong>.`;
    detail = `If you believe this update was made in error or require clarification, please contact our support team.`;
    buttonText = "Contact Support";
    buttonLink = SUPPORT_URL;
    break;

  case "custom clearance":
    title = "Shipment under customs clearance";
    subject = `Exodus Logistics: Customs clearance update (${opts.shipmentId})`;
    intro = `Your shipment <strong>${esc(opts.shipmentId)}</strong> is currently undergoing <strong>customs clearance</strong>.`;
    detail = `This is a routine compliance stage before the shipment proceeds toward <strong>${esc(destination)}</strong>.`;
    break;

  case "unclaimed":
    title = "Shipment marked unclaimed";
    subject = `Exodus Logistics: Shipment marked unclaimed (${opts.shipmentId})`;
    intro = `Your shipment <strong>${esc(opts.shipmentId)}</strong> is currently marked as <strong>unclaimed</strong>.`;
    detail = `Please contact our support team as soon as possible for assistance regarding the next required action.`;
    buttonText = "Contact Support";
    buttonLink = SUPPORT_URL;
    break;

  case "invalid address":
    title = "Address issue on shipment";
    subject = `Exodus Logistics: Address issue detected (${opts.shipmentId})`;
    intro = `Your shipment <strong>${esc(opts.shipmentId)}</strong> is currently on hold due to an <strong>address issue</strong>.`;
    detail = `Please contact support to confirm or correct the delivery address for <strong>${esc(destination)}</strong> so processing can continue.`;
    buttonText = "Contact Support";
    buttonLink = SUPPORT_URL;
    break;

  default:
    title = "Shipment update";
    subject = `Exodus Logistics: Shipment update (${opts.shipmentId})`;
    intro = `Your shipment <strong>${esc(opts.shipmentId)}</strong> has been updated to <strong>${esc(status)}</strong>.`;
    detail = `You may review the latest shipment progress using the tracking page.`;
    break;
}

const bodyHtml = `
  <p style="margin:0 0 14px 0;font-size:16px;line-height:24px;color:#111827;">
    Hello ${esc(name)},
  </p>

  <p style="margin:0 0 14px 0;font-size:16px;line-height:24px;color:#111827;">
    ${intro}
  </p>

  <p style="margin:0 0 14px 0;font-size:16px;line-height:24px;color:#111827;">
    ${detail}
  </p>

  <div style="margin:0 0 18px 0;padding:14px 16px;border:1px solid #e5e7eb;border-radius:12px;background:#f9fafb;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
      <tr>
        <td style="padding:0 0 10px 0;font-size:14px;color:#6b7280;font-weight:600;">Shipment ID</td>
        <td style="padding:0 0 10px 16px;font-size:15px;color:#111827;font-weight:700;">${esc(opts.shipmentId)}</td>
      </tr>
      <tr>
        <td style="padding:0 0 10px 0;font-size:14px;color:#6b7280;font-weight:600;">Tracking number</td>
        <td style="padding:0 0 10px 16px;font-size:15px;color:#111827;font-weight:700;">${esc(opts.trackingNumber || "—")}</td>
      </tr>
      <tr>
        <td style="padding:0 0 10px 0;font-size:14px;color:#6b7280;font-weight:600;">Invoice number</td>
        <td style="padding:0 0 10px 16px;font-size:15px;color:#111827;font-weight:700;">${esc(invoiceNumber)}</td>
      </tr>
      <tr>
        <td style="padding:0 0 10px 0;font-size:14px;color:#6b7280;font-weight:600;">Destination</td>
        <td style="padding:0 0 10px 16px;font-size:15px;color:#111827;">${esc(destination)}</td>
      </tr>
      <tr>
        <td style="padding:0;font-size:14px;color:#6b7280;font-weight:600;">Estimated delivery</td>
        <td style="padding:0 0 0 16px;font-size:15px;color:#111827;">${esc(estimatedDelivery)}</td>
      </tr>
    </table>
  </div>

  ${
    note
      ? `<div style="margin:0 0 16px 0;padding:12px 14px;border-left:4px solid #2563eb;background:#eff6ff;border-radius:10px;">
           <p style="margin:0;font-size:14px;line-height:22px;color:#1f2937;">
             <strong>Additional note:</strong> ${esc(note)}
           </p>
         </div>`
      : ""
  }

  <p style="margin:0;font-size:15px;color:#6b7280;">
    You can track the shipment or review the invoice using the links below.
  </p>

  <div style="margin-top:12px">
    <a href="${INVOICE_URL}" style="color:#2563eb;text-decoration:underline;font-weight:600;">
      View Invoice
    </a>
  </div>
`;

const html = renderEmailTemplate({
  subject,
  title,
  preheader: `${status} – Shipment ${opts.shipmentId}`,
  bodyHtml,
  button: { text: buttonText, href: buttonLink },
  appUrl: APP_URL,
  supportEmail: SUPPORT_EMAIL,
  sentTo: to,
});

return sendEmail(to, subject, html);
}

/** -------------------------
 * NEW: invoice update email by STATUS
 * ------------------------- */
export async function sendInvoiceUpdateEmail(
  to: string,
  opts: {
    name?: string;
    shipmentId: string;
    status?: InvoiceStatus | string;
    paid?: boolean;
    trackingNumber?: string;
    invoiceNumber?: string;
    locale?: string;
  }
) {
  if (!process.env.RESEND_API_KEY) throw new Error("Missing RESEND_API_KEY");

  const name = (opts.name || "Customer").trim();
  const locale = opts.locale || DEFAULT_LOCALE;

  const q = opts.trackingNumber || opts.shipmentId;
  const invoiceLink = buildInvoiceFullUrlByQ(q, locale);

  const invoiceNumber = makeInvoiceNumber({
    shipmentId: opts.shipmentId,
    trackingNumber: opts.trackingNumber,
    invoiceNumber: opts.invoiceNumber,
  });

  const status = opts.status
    ? normalizeInvoiceStatus(opts.status)
    : opts.paid
    ? "paid"
    : "unpaid";

  const statusLabel = invoiceStatusLabel(status);
  const subject = `Exodus Logistics: Invoice ${invoiceStatusSubject(status)} (${opts.shipmentId})`;

  const bodyHtml = `
    <p style="margin:0 0 14px 0;font-size:16px;line-height:24px;color:#111827;">
      Hello ${esc(name)},
    </p>

    <p style="margin:0 0 14px 0;font-size:16px;line-height:24px;color:#111827;">
      The invoice for shipment <strong>${esc(opts.shipmentId)}</strong> is now marked as
      <strong>${statusLabel}</strong>.
    </p>

    <p style="margin:0 0 14px 0;font-size:16px;line-height:24px;color:#111827;">
      ${esc(invoiceStatusMessage(status))}
    </p>

    <p style="margin:0 0 14px 0;font-size:15px;color:#111827;">
      <strong>Invoice number:</strong> ${esc(invoiceNumber)}
    </p>

    <div style="margin-top:12px">
      <a href="${invoiceLink}" style="color:#2563eb;text-decoration:underline;font-weight:600;">
        View Invoice
      </a>
    </div>
  `;

  const html = renderEmailTemplate({
    subject,
    title: `Invoice ${invoiceStatusSubject(status)}`,
    preheader: `Invoice for ${opts.shipmentId} is now ${statusLabel}.`,
    bodyHtml,
    button: { text: "View Invoice", href: invoiceLink },
    appUrl: APP_URL,
    supportEmail: SUPPORT_EMAIL,
    sentTo: to,
  });

  return sendEmail(to, subject, html);
}

/** -------------------------
 * NEW: receiver invoice status email by STATUS
 * ------------------------- */
export async function sendInvoiceStatusReceiverEmail(
  to: string,
  args: {
    name: string;
    senderName: string;
    shipmentId: string;
    trackingNumber: string;
    paid?: boolean;
    status?: InvoiceStatus | string;
    viewInvoiceUrl?: string;
    invoiceNumber?: string;
    locale?: string;
  }
) {
  if (!process.env.RESEND_API_KEY) throw new Error("Missing RESEND_API_KEY");

  const locale = args.locale || DEFAULT_LOCALE;
  const q = args.trackingNumber || args.shipmentId;

  const invoiceUrl =
    args.viewInvoiceUrl || `${APP_URL}/${locale}/invoice/full?q=${encodeURIComponent(q)}`;

  const invoiceNumber = makeInvoiceNumber({
    shipmentId: args.shipmentId,
    trackingNumber: args.trackingNumber,
    invoiceNumber: args.invoiceNumber,
  });

  const status = args.status
    ? normalizeInvoiceStatus(args.status)
    : args.paid
    ? "paid"
    : "unpaid";

  const statusLabel = invoiceStatusLabel(status);
  const subject = `Invoice ${invoiceStatusSubject(status)}: ${args.shipmentId}`;

  const bodyHtml = `
    <p style="margin:0 0 14px 0;font-size:16px;line-height:24px;color:#111827;">
      Hello ${esc(args.name || "Customer")},
    </p>

    <p style="margin:0 0 14px 0;font-size:16px;line-height:24px;color:#111827;">
      The invoice for shipment <strong>${esc(args.shipmentId)}</strong> (sent by <strong>${esc(
    args.senderName
  )}</strong>) is currently marked as <strong>${statusLabel}</strong>.
    </p>

    <p style="margin:0 0 14px 0;font-size:16px;line-height:24px;color:#111827;">
      ${esc(invoiceStatusMessage(status))}
    </p>

    <p style="margin:0 0 14px 0;font-size:15px;color:#111827;">
      <strong>Invoice number:</strong> ${esc(invoiceNumber)}
    </p>

    <p style="margin:0;font-size:15px;color:#6b7280;">
      You can view the invoice using the button below.
    </p>
  `;

  const html = renderEmailTemplate({
    subject,
    title: `Invoice ${invoiceStatusSubject(status)}`,
    preheader: `Invoice is ${statusLabel.toLowerCase()}`,
    bodyHtml,
    button: { text: "View Invoice", href: invoiceUrl },
    appUrl: APP_URL,
    supportEmail: SUPPORT_EMAIL,
    sentTo: to,
  });

  return sendEmail(to, subject, html);
}

/** -------------------------
 * NEW: shipment edited email
 * ------------------------- */
export async function sendShipmentEditedEmail(
  to: string,
  args: {
    name?: string;
    shipmentId: string;
    trackingNumber?: string;
    invoiceNumber?: string;
    locale?: string;
    intro?: string;
    changes: Array<{ label: string; oldValue?: any; newValue?: any }>;
  }
) {
  if (!process.env.RESEND_API_KEY) throw new Error("Missing RESEND_API_KEY");

  const name = cleanStr(args.name) || "Customer";
  const locale = args.locale || DEFAULT_LOCALE;
  const q = args.trackingNumber || args.shipmentId;

  const trackUrl = buildTrackUrl(q, locale);
  const invoiceUrl = buildInvoiceFullUrlByQ(q, locale);

  const invoiceNumber = makeInvoiceNumber({
    shipmentId: args.shipmentId,
    trackingNumber: args.trackingNumber,
    invoiceNumber: args.invoiceNumber,
  });

  const tableHtml = formatChangedFields(args.changes);

  const subject = `Exodus Logistics: Shipment details updated (${args.shipmentId})`;

  const bodyHtml = `
    <p style="margin:0 0 14px 0;font-size:16px;line-height:24px;color:#111827;">
      Hello ${esc(name)},
    </p>

    <p style="margin:0 0 14px 0;font-size:16px;line-height:24px;color:#111827;">
      ${esc(
        args.intro ||
          "Some shipment details have been updated. Please review the latest information below."
      )}
    </p>

    <p style="margin:0 0 14px 0;font-size:15px;color:#111827;">
      <strong>Shipment ID:</strong> ${esc(args.shipmentId)}<br/>
      ${args.trackingNumber ? `<strong>Tracking number:</strong> ${esc(args.trackingNumber)}<br/>` : ""}
      <strong>Invoice number:</strong> ${esc(invoiceNumber)}
    </p>

    ${tableHtml}

    <div style="margin-top:12px">
      <a href="${invoiceUrl}" style="color:#2563eb;text-decoration:underline;font-weight:600;">
        View Invoice
      </a>
    </div>
  `;

  const html = renderEmailTemplate({
    subject,
    title: "Shipment details updated",
    preheader: `Shipment ${args.shipmentId} details have been updated.`,
    bodyHtml,
    button: { text: "View Shipment", href: trackUrl },
    appUrl: APP_URL,
    supportEmail: SUPPORT_EMAIL,
    sentTo: to,
  });

  return sendEmail(to, subject, html);
}

/** -------------------------
 * LEGACY HTML EMAILS (kept)
 * ------------------------- */
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
      <p>Your shipment has been created and is being prepared to be shipped to <b>${escapeHtml(
        args.receiverName
      )}</b>.</p>
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
    paid?: boolean;
    status?: InvoiceStatus | string;
    viewInvoiceUrl: string;
  }
) {
  const status = args.status
    ? normalizeInvoiceStatus(args.status)
    : args.paid
    ? "paid"
    : "unpaid";

  const subject = `Invoice ${invoiceStatusSubject(status)}: ${args.shipmentId}`;
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5">
      <h2>Invoice Status</h2>
      <p>Hello ${escapeHtml(args.name || "Customer")},</p>
      <p>
        The invoice for shipment <b>${escapeHtml(args.shipmentId)}</b> is currently:
        <b style="color:${
          status === "paid"
            ? "#16a34a"
            : status === "overdue"
            ? "#dc2626"
            : status === "cancelled"
            ? "#6b7280"
            : "#d97706"
        }">${invoiceStatusLabel(status)}</b>.
      </p>
      <p>${escapeHtml(invoiceStatusMessage(status))}</p>
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

export async function sendShipmentDeletedEmail(
  to: string,
  args: {
    name?: string;
    shipmentId: string;
    trackingNumber?: string;
    locale?: string;
  }
) {
  if (!process.env.RESEND_API_KEY) throw new Error("Missing RESEND_API_KEY");

  const name = cleanStr(args.name) || "Customer";

  const subject = `Exodus Logistics: Shipment record removed (${args.shipmentId})`;

  const bodyHtml = `
    <p style="margin:0 0 14px 0;font-size:16px;line-height:24px;color:#111827;">
      Hello ${esc(name)},
    </p>

    <p style="margin:0 0 14px 0;font-size:16px;line-height:24px;color:#111827;">
      Please be informed that the shipment record for <strong>${esc(args.shipmentId)}</strong> has been removed from our tracking system.
    </p>

    <p style="margin:0 0 14px 0;font-size:16px;line-height:24px;color:#111827;">
      As a result, this shipment will no longer be available for tracking on our website.
    </p>

    <p style="margin:0 0 14px 0;font-size:15px;color:#111827;">
      <strong>Shipment ID:</strong> ${esc(args.shipmentId)}<br/>
      ${args.trackingNumber ? `<strong>Tracking number:</strong> ${esc(args.trackingNumber)}` : ""}
    </p>

    <p style="margin:0;font-size:15px;color:#6b7280;">
      If you believe this action was made in error or you need further clarification, please contact our support team.
    </p>
  `;

  const html = renderEmailTemplate({
    subject,
    title: "Shipment removed",
    preheader: `Shipment ${args.shipmentId} has been removed from tracking.`,
    bodyHtml,
    button: { text: "Contact support", href: SUPPORT_URL },
    appUrl: APP_URL,
    supportEmail: SUPPORT_EMAIL,
    sentTo: to,
  });

  return sendEmail(to, subject, html);
} 