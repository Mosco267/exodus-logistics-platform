import { Resend } from "resend";
import { renderEmailTemplate } from "@/lib/emailTemplate";
import clientPromise from "@/lib/mongodb";


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

function getButtonHrefFromType(
  buttonUrlType: string,
  urls: { trackUrl: string; invoiceUrl: string; supportUrl: string }
) {
  if (buttonUrlType === "invoice") return urls.invoiceUrl;
  if (buttonUrlType === "support") return urls.supportUrl;
  if (buttonUrlType === "none") return "";
  return urls.trackUrl;
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

function formatChangedFields(
  changes: Array<{ label: string; oldValue?: any; newValue?: any }>
) {
  const rows = changes
    .filter((c) => cleanStr(c.newValue))
    .map((c) => {
      const oldVal = cleanStr(c.oldValue) || "—";
      const newVal = cleanStr(c.newValue) || "—";

      return `
        <tr>
          <td style="padding:12px 14px;border-bottom:1px solid #e5e7eb;font-size:14px;color:#111827;font-weight:700;word-break:normal;overflow-wrap:anywhere;vertical-align:top;width:26%;">
            ${esc(c.label)}
          </td>
          <td style="padding:12px 14px;border-bottom:1px solid #e5e7eb;font-size:14px;color:#6b7280;vertical-align:top;word-break:break-word;line-height:22px;width:37%;">
            ${esc(oldVal)}
          </td>
          <td style="padding:12px 14px;border-bottom:1px solid #e5e7eb;font-size:14px;color:#111827;vertical-align:top;word-break:break-word;line-height:22px;width:37%;">
            ${esc(newVal)}
          </td>
        </tr>
      `;
    })
    .join("");

  if (!rows) return "";

  return `
    <div style="margin:16px 0 0 0;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;background:#ffffff;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;table-layout:fixed;background:#ffffff;">
        <thead>
          <tr style="background:#f9fafb;">
            <th align="left" style="padding:12px 14px;font-size:13px;color:#374151;border-bottom:1px solid #e5e7eb;">Field</th>
            <th align="left" style="padding:12px 14px;font-size:13px;color:#374151;border-bottom:1px solid #e5e7eb;">Previous</th>
            <th align="left" style="padding:12px 14px;font-size:13px;color:#374151;border-bottom:1px solid #e5e7eb;">Updated</th>
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

function normalizeTemplateKey(v: string) {
  return String(v || "").toLowerCase().trim().replace(/[\s_-]+/g, "");
}

function fillVars(template: string, vars: Record<string, any>) {
  let out = String(template || "");
  for (const [k, v] of Object.entries(vars)) {
    out = out.replace(new RegExp(`{{\\s*${k}\\s*}}`, "g"), String(v ?? ""));
  }
  return out;
}

async function getEmailTemplate(key: string) {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    const doc = await db.collection("email_templates").findOne(
      { key },
      { projection: { _id: 0 } }
    );

    return doc as any;
  } catch {
    return null;
  }
}

async function getStatusEmailConfig(statusLabel: string) {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    const normalized = normalizeTemplateKey(statusLabel);

    const all = await db
      .collection("statuses")
      .find({})
      .project({ _id: 0 })
      .toArray();

    const dbStatus =
      all.find((s: any) => normalizeTemplateKey(s?.key || "") === normalized) ||
      all.find((s: any) => normalizeTemplateKey(s?.label || "") === normalized) ||
      null;

    const defaultStatuses = [
      {
        key: "created",
        label: "Created",
        emailSubject: "Shipment created: {{shipmentId}}",
        emailTitle: "Shipment created",
        emailPreheader: "Shipment {{shipmentId}} has been created successfully.",
        emailBodyHtml: `
<p>Hello {{name}},</p>

<p>Your shipment <strong>{{shipmentId}}</strong> has been created successfully and is now being processed by our logistics team.</p>

<div style="margin:18px 0;">
  <p style="margin:0 0 12px 0;"><strong>Tracking Number:</strong><br/>{{trackingNumber}}</p>
  <p style="margin:0 0 12px 0;"><strong>Invoice Number:</strong><br/>{{invoiceNumber}}</p>
  <p style="margin:0;"><strong>Destination:</strong><br/>{{destination}}</p>
</div>

{{note}}

<div style="margin-top:12px;">
  <a href="{{invoiceUrl}}" style="color:#2563eb;text-decoration:underline;font-weight:600;">View Invoice</a>
</div>
        `.trim(),
        emailButtonText: "View Shipment",
        emailButtonUrlType: "track",
      },
      {
        key: "pickup",
        label: "Picked Up",
        emailSubject: "Shipment picked up: {{shipmentId}}",
        emailTitle: "Shipment picked up",
        emailPreheader: "Your shipment has been picked up successfully.",
        emailBodyHtml: `
<p>Hello {{name}},</p>

<p>We are pleased to inform you that your shipment <strong>{{shipmentId}}</strong> has been successfully picked up and entered into our logistics network.</p>

<p>The shipment is now being processed for movement from <strong>{{origin}}</strong> toward <strong>{{destination}}</strong>.</p>

<div style="margin:18px 0;">
  <p style="margin:0 0 12px 0;"><strong>Shipment Number:</strong><br/>{{shipmentId}}</p>
  <p style="margin:0 0 12px 0;"><strong>Tracking Number:</strong><br/>{{trackingNumber}}</p>
  <p style="margin:0;"><strong>Invoice Number:</strong><br/>{{invoiceNumber}}</p>
</div>

{{note}}

<div style="margin-top:12px;">
  <a href="{{invoiceUrl}}" style="color:#2563eb;text-decoration:underline;font-weight:600;">View Invoice</a>
</div>
        `.trim(),
        emailButtonText: "Track Shipment",
        emailButtonUrlType: "track",
      },
      {
        key: "warehouse",
        label: "Warehouse",
        emailSubject: "Shipment received at warehouse: {{shipmentId}}",
        emailTitle: "Shipment received at warehouse",
        emailPreheader: "Your shipment is now at our warehouse facility.",
        emailBodyHtml: `
<p>Hello {{name}},</p>

<p>Your shipment <strong>{{shipmentId}}</strong> has been received at our warehouse facility.</p>

<p>It is currently undergoing internal handling and preparation before moving to the next shipping stage toward <strong>{{destination}}</strong>.</p>

<div style="margin:18px 0;">
  <p style="margin:0 0 12px 0;"><strong>Shipment Number:</strong><br/>{{shipmentId}}</p>
  <p style="margin:0 0 12px 0;"><strong>Tracking Number:</strong><br/>{{trackingNumber}}</p>
  <p style="margin:0;"><strong>Invoice Number:</strong><br/>{{invoiceNumber}}</p>
</div>

{{note}}

<div style="margin-top:12px;">
  <a href="{{invoiceUrl}}" style="color:#2563eb;text-decoration:underline;font-weight:600;">View Invoice</a>
</div>
        `.trim(),
        emailButtonText: "Track Shipment",
        emailButtonUrlType: "track",
      },
      {
        key: "intransit",
        label: "In Transit",
        emailSubject: "Shipment in transit: {{shipmentId}}",
        emailTitle: "Shipment in transit",
        emailPreheader: "Your shipment is currently in transit.",
        emailBodyHtml: `
<p>Hello {{name}},</p>

<p>Your shipment <strong>{{shipmentId}}</strong> is now <strong>in transit</strong>.</p>

<p>It is currently moving toward <strong>{{destination}}</strong> from <strong>{{origin}}</strong>.</p>

<div style="margin:18px 0;">
  <p style="margin:0 0 12px 0;"><strong>Shipment Number:</strong><br/>{{shipmentId}}</p>
  <p style="margin:0 0 12px 0;"><strong>Tracking Number:</strong><br/>{{trackingNumber}}</p>
  <p style="margin:0 0 12px 0;"><strong>Invoice Number:</strong><br/>{{invoiceNumber}}</p>
  <p style="margin:0;"><strong>Destination:</strong><br/>{{destination}}</p>
</div>

{{note}}

<div style="margin-top:12px;">
  <a href="{{invoiceUrl}}" style="color:#2563eb;text-decoration:underline;font-weight:600;">View Invoice</a>
</div>
        `.trim(),
        emailButtonText: "Track Shipment",
        emailButtonUrlType: "track",
      },
      {
        key: "outfordelivery",
        label: "Out for Delivery",
        emailSubject: "Out for delivery: {{shipmentId}}",
        emailTitle: "Shipment out for delivery",
        emailPreheader: "Your shipment is now on its final delivery route.",
        emailBodyHtml: `
<p>Hello {{name}},</p>

<p>Your shipment <strong>{{shipmentId}}</strong> is now <strong>out for delivery</strong>.</p>

<p>Our delivery process is in progress and the shipment is on its final route to the delivery address below.</p>

<p><strong>Delivery Address:</strong><br/>{{fullDestination}}</p>

<p>Please make sure you are available and prepared to receive or pick up the shipment once delivery is completed.</p>

<div style="margin:18px 0;">
  <p style="margin:0 0 12px 0;"><strong>Shipment Number:</strong><br/>{{shipmentId}}</p>
  <p style="margin:0 0 12px 0;"><strong>Tracking Number:</strong><br/>{{trackingNumber}}</p>
  <p style="margin:0;"><strong>Invoice Number:</strong><br/>{{invoiceNumber}}</p>
</div>

{{note}}

<div style="margin-top:12px;">
  <a href="{{invoiceUrl}}" style="color:#2563eb;text-decoration:underline;font-weight:600;">View Invoice</a>
</div>
        `.trim(),
        emailButtonText: "Track Delivery",
        emailButtonUrlType: "track",
      },
      {
        key: "customclearance",
        label: "Custom Clearance",
        emailSubject: "Customs clearance update: {{shipmentId}}",
        emailTitle: "Shipment under customs clearance",
        emailPreheader: "Your shipment is undergoing customs clearance.",
        emailBodyHtml: `
<p>Hello {{name}},</p>

<p>Your shipment <strong>{{shipmentId}}</strong> is currently undergoing <strong>customs clearance</strong>.</p>

<p>This is a routine compliance stage before the shipment proceeds toward <strong>{{destination}}</strong>.</p>

<div style="margin:18px 0;">
  <p style="margin:0 0 12px 0;"><strong>Shipment Number:</strong><br/>{{shipmentId}}</p>
  <p style="margin:0 0 12px 0;"><strong>Tracking Number:</strong><br/>{{trackingNumber}}</p>
  <p style="margin:0 0 12px 0;"><strong>Invoice Number:</strong><br/>{{invoiceNumber}}</p>
  <p style="margin:0;"><strong>Destination:</strong><br/>{{destination}}</p>
</div>

{{note}}

<div style="margin-top:12px;">
  <a href="{{invoiceUrl}}" style="color:#2563eb;text-decoration:underline;font-weight:600;">View Invoice</a>
</div>
        `.trim(),
        emailButtonText: "Track Shipment",
        emailButtonUrlType: "track",
      },
      {
        key: "delivered",
        label: "Delivered",
        emailSubject: "Shipment delivered: {{shipmentId}}",
        emailTitle: "Shipment delivered",
        emailPreheader: "Your shipment has been delivered successfully.",
        emailBodyHtml: `
<p>Hello {{name}},</p>

<p>This is to confirm that your shipment <strong>{{shipmentId}}</strong> has been successfully <strong>delivered</strong>.</p>

<p>Delivery has been completed at <strong>{{fullDestination}}</strong>.</p>

<div style="margin:18px 0;">
  <p style="margin:0 0 12px 0;"><strong>Shipment Number:</strong><br/>{{shipmentId}}</p>
  <p style="margin:0 0 12px 0;"><strong>Tracking Number:</strong><br/>{{trackingNumber}}</p>
  <p style="margin:0 0 12px 0;"><strong>Invoice Number:</strong><br/>{{invoiceNumber}}</p>
  <p style="margin:0;"><strong>Destination:</strong><br/>{{destination}}</p>
</div>

{{note}}

<div style="margin-top:12px;">
  <a href="{{invoiceUrl}}" style="color:#2563eb;text-decoration:underline;font-weight:600;">View Invoice</a>
</div>
        `.trim(),
        emailButtonText: "View Shipment",
        emailButtonUrlType: "track",
      },
      {
        key: "unclaimed",
        label: "Unclaimed",
        emailSubject: "Shipment marked unclaimed: {{shipmentId}}",
        emailTitle: "Shipment marked unclaimed",
        emailPreheader: "Your shipment is currently marked as unclaimed.",
        emailBodyHtml: `
<p>Hello {{name}},</p>

<p>Your shipment <strong>{{shipmentId}}</strong> is currently marked as <strong>unclaimed</strong>.</p>

<p>Please contact our support team as soon as possible for assistance regarding the next required action.</p>

<div style="margin:18px 0;">
  <p style="margin:0 0 12px 0;"><strong>Shipment Number:</strong><br/>{{shipmentId}}</p>
  <p style="margin:0 0 12px 0;"><strong>Tracking Number:</strong><br/>{{trackingNumber}}</p>
  <p style="margin:0;"><strong>Invoice Number:</strong><br/>{{invoiceNumber}}</p>
</div>

{{note}}
        `.trim(),
        emailButtonText: "Contact support",
        emailButtonUrlType: "support",
      },
      {
        key: "invalidaddress",
        label: "Invalid Address",
        emailSubject: "Address issue detected: {{shipmentId}}",
        emailTitle: "Address issue on shipment",
        emailPreheader: "Please review your shipment delivery address.",
        emailBodyHtml: `
<p>Hello {{name}},</p>

<p>Your shipment <strong>{{shipmentId}}</strong> is currently on hold due to an <strong>address issue</strong>.</p>

<p>Please confirm or correct the delivery address so processing can continue without delay.</p>

<div style="margin:18px 0;">
  <p style="margin:0 0 12px 0;"><strong>Shipment Number:</strong><br/>{{shipmentId}}</p>
  <p style="margin:0 0 12px 0;"><strong>Tracking Number:</strong><br/>{{trackingNumber}}</p>
  <p style="margin:0;"><strong>Invoice Number:</strong><br/>{{invoiceNumber}}</p>
</div>

{{note}}
        `.trim(),
        emailButtonText: "Track Shipment",
        emailButtonUrlType: "track",
      },
      {
        key: "paymentissue",
        label: "Payment Issue",
        emailSubject: "Payment issue: {{shipmentId}}",
        emailTitle: "Payment issue on shipment",
        emailPreheader: "There is a payment issue affecting your shipment.",
        emailBodyHtml: `
<p>Hello {{name}},</p>

<p>Your shipment <strong>{{shipmentId}}</strong> is currently affected by a <strong>payment issue</strong>.</p>

<p>Please complete or resolve payment so shipment processing can continue to the next stage.</p>

<div style="margin:18px 0;">
  <p style="margin:0 0 12px 0;"><strong>Shipment Number:</strong><br/>{{shipmentId}}</p>
  <p style="margin:0 0 12px 0;"><strong>Tracking Number:</strong><br/>{{trackingNumber}}</p>
  <p style="margin:0;"><strong>Invoice Number:</strong><br/>{{invoiceNumber}}</p>
</div>

{{note}}

<div style="margin-top:12px;">
  <a href="{{invoiceUrl}}" style="color:#2563eb;text-decoration:underline;font-weight:600;">View Invoice</a>
</div>
        `.trim(),
        emailButtonText: "Track Shipment",
        emailButtonUrlType: "track",
      },
      {
        key: "cancelled",
        label: "Cancelled",
        emailSubject: "Shipment cancelled: {{shipmentId}}",
        emailTitle: "Shipment cancelled",
        emailPreheader: "Your shipment has been cancelled.",
        emailBodyHtml: `
<p>Hello {{name}},</p>

<p>Your shipment <strong>{{shipmentId}}</strong> has been marked as <strong>cancelled</strong>.</p>

<p>If you believe this was done in error, please contact our support team for clarification.</p>

<div style="margin:18px 0;">
  <p style="margin:0 0 12px 0;"><strong>Shipment Number:</strong><br/>{{shipmentId}}</p>
  <p style="margin:0 0 12px 0;"><strong>Tracking Number:</strong><br/>{{trackingNumber}}</p>
  <p style="margin:0;"><strong>Invoice Number:</strong><br/>{{invoiceNumber}}</p>
</div>

{{note}}
        `.trim(),
        emailButtonText: "Contact Support",
        emailButtonUrlType: "support",
      },
    ];

    const defaultStatus =
      defaultStatuses.find((s) => normalizeTemplateKey(s.key) === normalized) ||
      defaultStatuses.find((s) => normalizeTemplateKey(s.label) === normalized) ||
      null;

    if (!defaultStatus && !dbStatus) return null;
    if (!defaultStatus) return dbStatus;
    if (!dbStatus) return defaultStatus;

    return {
      ...defaultStatus,
      ...dbStatus,
      emailSubject: cleanStr(dbStatus.emailSubject) || defaultStatus.emailSubject,
      emailTitle: cleanStr(dbStatus.emailTitle) || defaultStatus.emailTitle,
      emailPreheader: cleanStr(dbStatus.emailPreheader) || defaultStatus.emailPreheader,
      emailBodyHtml: cleanStr(dbStatus.emailBodyHtml) || defaultStatus.emailBodyHtml,
      emailButtonText: cleanStr(dbStatus.emailButtonText) || defaultStatus.emailButtonText,
      emailButtonUrlType: cleanStr(dbStatus.emailButtonUrlType) || defaultStatus.emailButtonUrlType,
    };
  } catch {
    return null;
  }
}

function invoiceSearchUrl(locale = DEFAULT_LOCALE) {
  return `${APP_URL}/${locale}/invoice`;
}

export async function sendEmail(to: string, subject: string, html: string) {
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

function formatEstimatedDeliveryDateRange(
  iso?: string | null,
  shipmentScope?: string | null
) {
  if (!iso) return "—";

  const start = new Date(iso);
  if (Number.isNaN(start.getTime())) return "—";

  const end = new Date(start);
  const extraDays =
    String(shipmentScope || "").toLowerCase() === "local" ? 2 : 3;

  end.setDate(end.getDate() + extraDays);

  const startText = start.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  const endText = end.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return `${startText} - ${endText}`;
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
    shipmentScope?: string | null;
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

  const estimatedDeliveryText = formatEstimatedDeliveryDateRange(
    args.estimatedDeliveryDate,
    args.shipmentScope
  );

  const invoiceStatusText = paid ? "PAID" : "UNPAID";
  const paymentMessage = paid
    ? "We will move your shipment to the next stage shortly and keep you updated."
    : "Please complete payment so we can move your shipment to the next stage of processing.";

  const templateOverride = await getEmailTemplate("shipment_created_sender");

  const defaultSubject = paid
    ? `Shipment created: ${args.shipmentId}`
    : `Action required: Payment needed for shipment ${args.shipmentId}`;

  const defaultTitle = paid ? "Shipment created" : "Payment required";

  const defaultPreheader = paid
    ? `Shipment ${args.shipmentId} created (Paid)`
    : `Shipment ${args.shipmentId} created (Unpaid)`;

  const defaultBodyHtml = `
    <p style="margin:0 0 14px 0;font-size:16px;line-height:24px;color:#111827;">
      Hello ${esc(name)},
    </p>

    <p style="margin:0 0 14px 0;font-size:16px;line-height:24px;color:#111827;">
      Your shipment <strong>${esc(args.shipmentId)}</strong> has been created successfully and is being prepared for delivery to
      <strong>${esc(receiverName)}</strong>.
    </p>

    <p style="margin:0 0 18px 0;font-size:16px;line-height:24px;color:#111827;">
      <strong>Invoice status:</strong> <strong>${invoiceStatusText}</strong><br/>
      <strong>Estimated delivery date:</strong> ${esc(estimatedDeliveryText)}<br/>
      ${paymentMessage}
    </p>

    <div style="margin:0 0 18px 0;padding:8px 0 0 0;background:#ffffff;">
      <p style="margin:0 0 10px 0;font-size:15px;line-height:24px;color:#111827;">
        <strong>Shipment Number:</strong>
        <span style="white-space:nowrap;word-break:keep-all;"> ${esc(args.shipmentId)}</span>
      </p>

      <p style="margin:0 0 10px 0;font-size:15px;line-height:24px;color:#111827;">
        <strong>Tracking Number:</strong>
        <span style="white-space:nowrap;word-break:keep-all;"> ${esc(args.trackingNumber)}</span>
      </p>

      <p style="margin:0 0 10px 0;font-size:15px;line-height:24px;color:#111827;">
        <strong>Invoice Number:</strong>
        <span style="white-space:nowrap;word-break:keep-all;"> ${esc(invoiceNumber)}</span>
      </p>

      <p style="margin:0;font-size:12px;color:#6b7280;">
        Tip: Save these details for verification on our official website.
      </p>
    </div>

    <p style="margin:0;font-size:15px;color:#6b7280;">
      You can view shipment status or open your invoice using the links below.
    </p>

    <div style="margin-top:12px">
      <a href="${invoiceUrl}" style="color:#2563eb;text-decoration:underline;font-weight:600;">
        View Invoice
      </a>
    </div>
  `;

  const vars = {
    name: esc(name),
    receiverName: esc(receiverName),
    shipmentId: esc(args.shipmentId),
    trackingNumber: esc(args.trackingNumber),
    invoiceNumber: esc(invoiceNumber),
    invoiceStatus: esc(invoiceStatusText),
    estimatedDeliveryDate: esc(estimatedDeliveryText),
    paymentMessage: esc(paymentMessage),
    trackUrl,
    invoiceUrl,
  };

  const finalSubject = templateOverride?.subject
    ? fillVars(templateOverride.subject, vars)
    : defaultSubject;

  const finalTitle = templateOverride?.title
    ? fillVars(templateOverride.title, vars)
    : defaultTitle;

  const finalPreheader = templateOverride?.preheader
    ? fillVars(templateOverride.preheader, vars)
    : defaultPreheader;

  const finalBodyHtml = templateOverride?.bodyHtml
    ? fillVars(templateOverride.bodyHtml, vars)
    : defaultBodyHtml;

  const finalButtonText = templateOverride?.buttonText
    ? fillVars(templateOverride.buttonText, vars)
    : "View Shipment";

  const finalButtonHref =
    templateOverride?.buttonUrlType === "invoice"
      ? invoiceUrl
      : templateOverride?.buttonUrlType === "support"
      ? SUPPORT_URL
      : trackUrl;

  const html = renderEmailTemplate({
    subject: finalSubject,
    title: finalTitle,
    preheader: finalPreheader,
    bodyHtml: finalBodyHtml,
    button:
      templateOverride?.buttonUrlType === "none"
        ? undefined
        : { text: finalButtonText, href: finalButtonHref },
    appUrl: APP_URL,
    supportEmail: SUPPORT_EMAIL,
    sentTo: to,
  });

  return sendEmail(to, finalSubject, html);
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
    shipmentScope?: string | null;
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

  const estimatedDeliveryText = formatEstimatedDeliveryDateRange(
    args.estimatedDeliveryDate,
    args.shipmentScope
  );

  const invoiceStatusText = paid ? "PAID" : "UNPAID";
  const paymentMessage = paid
    ? "Your shipment is being prepared for dispatch and will move to the next stage shortly."
    : "Once payment is completed, the shipment will move to the next stage and you will receive updates.";

  const templateOverride = await getEmailTemplate("shipment_created_receiver");

  const defaultSubject = paid
    ? `Shipment on the way: ${args.shipmentId}`
    : `Shipment created for you: ${args.shipmentId} (Payment pending)`;

  const defaultTitle = "Shipment created";

  const defaultPreheader = paid
    ? `Shipment ${args.shipmentId} created (Paid)`
    : `Shipment ${args.shipmentId} created (Unpaid)`;

  const defaultBodyHtml = `
    <p style="margin:0 0 14px 0;font-size:16px;line-height:24px;color:#111827;">
      Hello ${esc(name)},
    </p>

    <p style="margin:0 0 14px 0;font-size:16px;line-height:24px;color:#111827;">
      A shipment has been created for you by <strong>${esc(senderName)}</strong>.
    </p>

    <p style="margin:0 0 18px 0;font-size:16px;line-height:24px;color:#111827;">
      <strong>Invoice status:</strong> <strong>${invoiceStatusText}</strong><br/>
      <strong>Estimated delivery date:</strong> ${esc(estimatedDeliveryText)}<br/>
      ${paymentMessage}
    </p>

    <div style="margin:0 0 18px 0;padding:8px 0 0 0;background:#ffffff;">
      <p style="margin:0 0 10px 0;font-size:15px;line-height:24px;color:#111827;">
        <strong>Shipment Number:</strong>
        <span style="white-space:nowrap;word-break:keep-all;"> ${esc(args.shipmentId)}</span>
      </p>

      <p style="margin:0 0 10px 0;font-size:15px;line-height:24px;color:#111827;">
        <strong>Tracking Number:</strong>
        <span style="white-space:nowrap;word-break:keep-all;"> ${esc(args.trackingNumber)}</span>
      </p>

      <p style="margin:0 0 10px 0;font-size:15px;line-height:24px;color:#111827;">
        <strong>Invoice Number:</strong>
        <span style="white-space:nowrap;word-break:keep-all;"> ${esc(invoiceNumber)}</span>
      </p>
    </div>

    <p style="margin:0;font-size:15px;color:#6b7280;">
      You can view shipment status or open your invoice using the links below.
    </p>

    <div style="margin-top:12px">
      <a href="${invoiceUrl}" style="color:#2563eb;text-decoration:underline;font-weight:600;">
        View Invoice
      </a>
    </div>
  `;

  const vars = {
    name: esc(name),
    senderName: esc(senderName),
    shipmentId: esc(args.shipmentId),
    trackingNumber: esc(args.trackingNumber),
    invoiceNumber: esc(invoiceNumber),
    invoiceStatus: esc(invoiceStatusText),
    estimatedDeliveryDate: esc(estimatedDeliveryText),
    paymentMessage: esc(paymentMessage),
    trackUrl,
    invoiceUrl,
  };

  const finalSubject = templateOverride?.subject
    ? fillVars(templateOverride.subject, vars)
    : defaultSubject;

  const finalTitle = templateOverride?.title
    ? fillVars(templateOverride.title, vars)
    : defaultTitle;

  const finalPreheader = templateOverride?.preheader
    ? fillVars(templateOverride.preheader, vars)
    : defaultPreheader;

  const finalBodyHtml = templateOverride?.bodyHtml
    ? fillVars(templateOverride.bodyHtml, vars)
    : defaultBodyHtml;

  const finalButtonText = templateOverride?.buttonText
    ? fillVars(templateOverride.buttonText, vars)
    : "View Shipment";

  const finalButtonHref =
    templateOverride?.buttonUrlType === "invoice"
      ? invoiceUrl
      : templateOverride?.buttonUrlType === "support"
      ? SUPPORT_URL
      : trackUrl;

  const html = renderEmailTemplate({
    subject: finalSubject,
    title: finalTitle,
    preheader: finalPreheader,
    bodyHtml: finalBodyHtml,
    button:
      templateOverride?.buttonUrlType === "none"
        ? undefined
        : { text: finalButtonText, href: finalButtonHref },
    appUrl: APP_URL,
    supportEmail: SUPPORT_EMAIL,
    sentTo: to,
  });

  return sendEmail(to, finalSubject, html);
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
    fullDestination?: string;
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
  const fullDestination = cleanStr(opts.fullDestination) || destination;
  const origin = cleanStr(opts.origin) || "origin facility";
  const note = cleanStr(opts.note);

  const normalizedStatus = normalizeTemplateKey(status);
  const statusOverride = await getStatusEmailConfig(status);

  let subject = `Exodus Logistics: Shipment update (${opts.shipmentId})`;
  let title = "Shipment update";
  let buttonText = "Track Shipment";
  let buttonLink = TRACK_URL;

  let intro = "";
  let detail = "";
  let extra = "";

  if (normalizedStatus === "pickup" || normalizedStatus === "pickedup") {
    title = "Shipment picked up";
    subject = `Exodus Logistics: Shipment picked up (${opts.shipmentId})`;
    intro = `We are pleased to inform you that your shipment <strong>${esc(opts.shipmentId)}</strong> has been successfully picked up and entered into our logistics network.`;
    detail = `The shipment is now being processed for movement from <strong>${esc(origin)}</strong> toward <strong>${esc(destination)}</strong>.`;
    extra = `Our team will continue processing the shipment and you will receive another update once it reaches the next checkpoint.`;
  } else if (normalizedStatus === "warehouse") {
    title = "Shipment received at warehouse";
    subject = `Exodus Logistics: Shipment received at warehouse (${opts.shipmentId})`;
    intro = `Your shipment <strong>${esc(opts.shipmentId)}</strong> has been received at our warehouse facility.`;
    detail = `It is currently undergoing internal handling and preparation before moving to the next shipping stage toward <strong>${esc(destination)}</strong>.`;
    extra = `You will be notified again as soon as the shipment leaves the warehouse and proceeds to transit.`;
  } else if (normalizedStatus === "intransit") {
    title = "Shipment in transit";
    subject = `Exodus Logistics: Shipment in transit (${opts.shipmentId})`;
    intro = `Your shipment <strong>${esc(opts.shipmentId)}</strong> is now <strong>in transit</strong>.`;
    detail = `It is currently moving through our logistics network from <strong>${esc(origin)}</strong> toward <strong>${esc(destination)}</strong>.`;
    extra = `Our system will continue to provide updates as the shipment progresses through the next checkpoints.`;
  } else if (normalizedStatus === "outfordelivery") {
    title = "Shipment out for delivery";
    subject = `Exodus Logistics: Out for delivery (${opts.shipmentId})`;
    buttonText = "Track Delivery";
    intro = `Your shipment <strong>${esc(opts.shipmentId)}</strong> is now <strong>out for delivery</strong>.`;
    detail = `Our delivery process is in progress and the shipment is on its final route to the delivery address below.`;
    extra = `Please make sure you are available and prepared to receive or pick up the shipment once delivery is completed.`;
  } else if (normalizedStatus === "delivered") {
    title = "Shipment delivered";
    subject = `Exodus Logistics: Shipment delivered (${opts.shipmentId})`;
    buttonText = "View Shipment";
    intro = `This is to confirm that your shipment <strong>${esc(opts.shipmentId)}</strong> has been successfully <strong>delivered</strong>.`;
    detail = `Delivery has been completed at <strong>${esc(fullDestination)}</strong>.`;
    extra = `If you have any concern regarding the delivery or need clarification, please contact our support team with your shipment details.`;
  } else if (normalizedStatus === "customclearance") {
    title = "Shipment under customs clearance";
    subject = `Exodus Logistics: Customs clearance update (${opts.shipmentId})`;
    intro = `Your shipment <strong>${esc(opts.shipmentId)}</strong> is currently undergoing <strong>customs clearance</strong>.`;
    detail = `This is a routine compliance stage before the shipment proceeds toward <strong>${esc(destination)}</strong>.`;
    extra = `If any additional verification is required, our team will contact you promptly and provide further guidance.`;
  } else if (normalizedStatus === "unclaimed") {
    title = "Shipment marked unclaimed";
    subject = `Exodus Logistics: Shipment marked unclaimed (${opts.shipmentId})`;
    buttonText = "Contact Support";
    buttonLink = SUPPORT_URL;
    intro = `Your shipment <strong>${esc(opts.shipmentId)}</strong> is currently marked as <strong>unclaimed</strong>.`;
    detail = `The shipment is being held pending the next required action from the recipient or support team.`;
    extra = `Please contact our support team as soon as possible for assistance regarding pickup, redelivery, or further instructions.`;
  } else if (normalizedStatus === "invalidaddress") {
    title = "Address issue on shipment";
    subject = `Exodus Logistics: Address issue detected (${opts.shipmentId})`;
    buttonText = "Contact Support";
    buttonLink = SUPPORT_URL;
    intro = `Your shipment <strong>${esc(opts.shipmentId)}</strong> is currently on hold due to an <strong>address issue</strong>.`;
    detail = `We were unable to proceed normally because the destination address requires confirmation or correction.`;
    extra = `Please contact support to verify the correct delivery details so shipment processing can continue without further delay.`;
  } else if (normalizedStatus === "paymentissue") {
    title = "Shipment update";
    subject = `Exodus Logistics: Payment issue (${opts.shipmentId})`;
    intro = `Your shipment <strong>${esc(opts.shipmentId)}</strong> has been updated to <strong>Payment Issue</strong>.`;
    detail = `There is currently an issue affecting payment confirmation or processing for this shipment.`;
    extra = `Please review the invoice and complete any required payment so shipment processing can resume normally.`;
  } else if (normalizedStatus === "cancelled" || normalizedStatus === "canceled") {
    title = "Shipment cancelled";
    subject = `Exodus Logistics: Shipment cancelled (${opts.shipmentId})`;
    buttonText = "Contact Support";
    buttonLink = SUPPORT_URL;
    intro = `Your shipment <strong>${esc(opts.shipmentId)}</strong> has been marked as <strong>cancelled</strong>.`;
    detail = `This shipment is no longer progressing through our logistics network.`;
    extra = `If you believe this update was made in error or require clarification, please contact our support team for assistance.`;
  } else if (normalizedStatus === "created") {
    title = "Shipment created";
    subject = `Exodus Logistics: Shipment created (${opts.shipmentId})`;
    buttonText = "View Shipment";
    intro = `Your shipment <strong>${esc(opts.shipmentId)}</strong> has been successfully created in our system.`;
    detail = `It is now being processed and prepared for the next logistics stage toward <strong>${esc(destination)}</strong>.`;
    extra = `You will receive additional notifications as soon as the shipment moves through the next checkpoints.`;
  } else {
    title = "Shipment update";
    subject = `Exodus Logistics: Shipment update (${opts.shipmentId})`;
    intro = `Your shipment <strong>${esc(opts.shipmentId)}</strong> has been updated to <strong>${esc(status)}</strong>.`;
    detail = `You may review the latest shipment progress and invoice information using the links below.`;
    extra = `We will continue to keep you informed as new updates become available.`;
  }

  const destinationLabel =
    normalizedStatus === "outfordelivery"
      ? "Delivery Address"
      : "Destination";

  const destinationValue =
    normalizedStatus === "outfordelivery" || normalizedStatus === "delivered"
      ? fullDestination
      : destination;

  const noteHtml = note
    ? `
      <div style="margin:20px 0 0 0;padding:14px 16px;border-left:4px solid #2563eb;background:#eff6ff;border-radius:10px;">
        <p style="margin:0;font-size:14px;line-height:22px;color:#1f2937;">
          <strong>Additional note:</strong> ${esc(note)}
        </p>
      </div>
    `
    : "";

  const detailsCardHtml = `
<div style="margin:18px 0;padding:14px 16px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0"
    style="width:100%;border-collapse:collapse;font-size:13px;line-height:20px;color:#111827;">

    <tr>
      <td style="padding:5px 0;color:#6b7280;font-weight:500;white-space:nowrap;">
        Shipment Number
      </td>

      <td style="padding:5px 0;font-weight:700;color:#1d4ed8;text-align:right;white-space:nowrap;">
        ${esc(opts.shipmentId)}
      </td>
    </tr>

    <tr>
      <td style="padding:5px 0;color:#6b7280;font-weight:500;white-space:nowrap;">
        Tracking Number
      </td>

      <td style="padding:5px 0;font-weight:700;color:#1d4ed8;text-align:right;white-space:nowrap;">
        ${esc(opts.trackingNumber || "—")}
      </td>
    </tr>

    <tr>
      <td style="padding:5px 0;color:#6b7280;font-weight:500;white-space:nowrap;">
        Invoice Number
      </td>

      <td style="padding:5px 0;font-weight:700;color:#1d4ed8;text-align:right;white-space:nowrap;">
        ${esc(invoiceNumber)}
      </td>
    </tr>

  </table>
</div>
`;

  const destinationBlockHtml = `
    <div style="margin:18px 0 0 0;">
      <p style="margin:0 0 6px 0;font-size:14px;line-height:20px;color:#6b7280;">
        ${destinationLabel}
      </p>
      <p style="margin:0;font-size:15px;line-height:24px;font-weight:700;color:#111827;">
        ${esc(destinationValue)}
      </p>
    </div>
  `;

  const statusBadgeHtml = `
    <div style="margin:0 0 14px 0;">
      <span style="display:inline-block;background:#eff6ff;color:#1d4ed8;font-size:12px;font-weight:800;letter-spacing:.3px;padding:6px 10px;border-radius:999px;text-transform:uppercase;">
        ${esc(status)}
      </span>
    </div>
  `;

  const defaultBodyHtml = `
    ${statusBadgeHtml}

    <p style="margin:0 0 16px 0;font-size:16px;line-height:26px;color:#111827;">
      Hello ${esc(name)},
    </p>

    <p style="margin:0 0 14px 0;font-size:16px;line-height:26px;color:#111827;">
      ${intro}
    </p>

    <p style="margin:0 0 14px 0;font-size:16px;line-height:26px;color:#111827;">
      ${detail}
    </p>

    <p style="margin:0 0 6px 0;font-size:16px;line-height:26px;color:#111827;">
      ${extra}
    </p>

    ${detailsCardHtml}

    ${destinationBlockHtml}

    ${noteHtml}

    <p style="margin:20px 0 0 0;font-size:15px;line-height:24px;color:#6b7280;">
      You can track the shipment or review the invoice using the links below.
    </p>

    <div style="margin-top:12px">
      <a href="${INVOICE_URL}" style="color:#2563eb;text-decoration:underline;font-weight:700;">
        View Invoice
      </a>
    </div>
  `;

  const vars = {
    name: esc(name),
    shipmentId: esc(opts.shipmentId),
    trackingNumber: esc(opts.trackingNumber || "—"),
    invoiceNumber: esc(invoiceNumber),
    destination: esc(destination),
    fullDestination: esc(fullDestination),
    origin: esc(origin),
    note: noteHtml,
    trackUrl: TRACK_URL,
    invoiceUrl: INVOICE_URL,
    status: esc(status),
  };

  const finalSubject = statusOverride?.emailSubject
    ? fillVars(statusOverride.emailSubject, vars)
    : subject;

  const finalTitle = statusOverride?.emailTitle
    ? fillVars(statusOverride.emailTitle, vars)
    : title;

  const finalPreheader = statusOverride?.emailPreheader
    ? fillVars(statusOverride.emailPreheader, vars)
    : `${status} – Shipment ${opts.shipmentId}`;

  const finalButtonText = statusOverride?.emailButtonText
    ? fillVars(statusOverride.emailButtonText, vars)
    : buttonText;

  const statusButtonType = String(statusOverride?.emailButtonUrlType || "")
    .trim()
    .toLowerCase();

  const finalButtonHref =
    statusButtonType === "invoice"
      ? INVOICE_URL
      : statusButtonType === "support"
      ? SUPPORT_URL
      : statusButtonType === "none"
      ? ""
      : buttonLink;

  const html = renderEmailTemplate({
    subject: finalSubject,
    title: finalTitle,
    preheader: finalPreheader,
    bodyHtml: defaultBodyHtml,
    button: finalButtonHref
      ? { text: finalButtonText || "Track Shipment", href: finalButtonHref }
      : undefined,
    appUrl: APP_URL,
    supportEmail: SUPPORT_EMAIL,
    sentTo: to,
  });

  return sendEmail(to, finalSubject, html);
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
      <strong>Invoice Number:</strong> ${esc(invoiceNumber)}
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
      <strong>Invoice Number:</strong> ${esc(invoiceNumber)}
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

    <div style="margin:0 0 14px 0;">
  <p style="margin:0 0 8px 0;font-size:15px;line-height:24px;color:#111827;">
    <strong>Shipment Number:</strong>
    <span style="white-space:nowrap;word-break:keep-all;"> ${esc(args.shipmentId)}</span>
  </p>

  ${
    args.trackingNumber
      ? `<p style="margin:0 0 8px 0;font-size:15px;line-height:24px;color:#111827;">
           <strong>Tracking Number:</strong>
           <span style="white-space:nowrap;word-break:keep-all;"> ${esc(args.trackingNumber)}</span>
         </p>`
      : ""
  }

  <p style="margin:0;font-size:15px;line-height:24px;color:#111827;">
    <strong>Invoice Number:</strong>
    <span style="white-space:nowrap;word-break:keep-all;"> ${esc(invoiceNumber)}</span>
  </p>
</div>
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
      <p><b>Shipment Number:</b> ${escapeHtml(args.shipmentId)}<br/>
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

    <div style="margin:0 0 14px 0;">
  <p style="margin:0 0 8px 0;font-size:15px;line-height:24px;color:#111827;">
    <strong>Shipment Number:</strong>
    <span style="white-space:nowrap;word-break:keep-all;"> ${esc(args.shipmentId)}</span>
  </p>

  ${
    args.trackingNumber
      ? `<p style="margin:0;font-size:15px;line-height:24px;color:#111827;">
           <strong>Tracking Number:</strong>
           <span style="white-space:nowrap;word-break:keep-all;"> ${esc(args.trackingNumber)}</span>
         </p>`
      : ""
  }
</div>

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