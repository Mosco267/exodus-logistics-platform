import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { renderEmailTemplate } from "@/lib/emailTemplate";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const APP_URL = (process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "https://www.goexoduslogistics.com").replace(/\/$/, "");
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || "support@goexoduslogistics.com";
const RESEND_FROM = process.env.RESEND_FROM || `Exodus Logistics <${SUPPORT_EMAIL}>`;

function esc(s: string) {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function renderDetailsCard(args: {
  shipmentId: string;
  trackingNumber: string;
  invoiceNumber: string;
}) {
  return `<table role="presentation" align="center" width="100%" cellspacing="0" cellpadding="0" style="margin:22px auto 0 auto;border-collapse:separate;width:100%;max-width:560px;background:#f8fafc;border:1px solid #e5e7eb;border-radius:16px;"><tr><td style="padding:14px 20px;border-radius:16px;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;width:100%;table-layout:fixed;"><tr><td style="padding:8px 0;font-size:12px;line-height:18px;color:#6b7280;font-weight:600;white-space:nowrap;width:45%;">Shipment Number:</td><td align="right" style="padding:8px 0;font-size:12px;line-height:18px;color:#1d4ed8;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;width:55%;">${esc(args.shipmentId)}</td></tr><tr><td style="padding:8px 0;font-size:12px;line-height:18px;color:#6b7280;font-weight:600;white-space:nowrap;width:45%;">Tracking Number:</td><td align="right" style="padding:8px 0;font-size:12px;line-height:18px;color:#1d4ed8;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;width:55%;">${esc(args.trackingNumber || "—")}</td></tr><tr><td style="padding:8px 0;font-size:12px;line-height:18px;color:#6b7280;font-weight:600;white-space:nowrap;width:45%;">Invoice Number:</td><td align="right" style="padding:8px 0;font-size:12px;line-height:18px;color:#1d4ed8;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;width:55%;">${esc(args.invoiceNumber)}</td></tr></table></td></tr></table>`;
}

function renderInfoCard(rows: Array<{ label: string; value: string }>) {
  const body = rows.map((row) => `<tr><td style="padding:8px 0;font-size:12px;line-height:18px;color:#6b7280;font-weight:600;white-space:nowrap;width:45%;">${esc(row.label)}:</td><td align="right" style="padding:8px 0;font-size:12px;line-height:18px;color:#1d4ed8;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;width:55%;">${esc(row.value)}</td></tr>`).join("");
  return `<table role="presentation" align="center" width="100%" cellspacing="0" cellpadding="0" style="margin:22px auto 0 auto;border-collapse:separate;width:100%;max-width:560px;background:#f8fafc;border:1px solid #e5e7eb;border-radius:16px;"><tr><td style="padding:14px 20px;border-radius:16px;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;width:100%;table-layout:fixed;">${body}</table></td></tr></table>`;
}

function fillVars(template: string, vars: Record<string, string>) {
  let out = template;
  for (const [k, v] of Object.entries(vars)) {
    out = out.replace(new RegExp(`{{\\s*${k}\\s*}}`, "g"), v);
  }
  return out;
}

function toText(html: string) {
  return html.replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>/gi, "\n\n").replace(/<[^>]+>/g, "").replace(/\s+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const templateKey = String(body?.templateKey || "").trim();
    const to = String(body?.to || "").trim().toLowerCase();
    const name = String(body?.name || "Customer").trim();
    const shipmentId = String(body?.shipmentId || "").trim();
    const trackingNumber = String(body?.trackingNumber || "").trim();

    if (!templateKey || !to || !shipmentId) {
      return NextResponse.json({ error: "templateKey, to, and shipmentId are required." }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    const template = await db.collection("email_templates").findOne({ key: templateKey }, { projection: { _id: 0 } }) as any;

    if (!template) {
      return NextResponse.json({ error: "Template not found." }, { status: 404 });
    }

    // Fetch actual shipment to get invoice number
    const shipmentDoc = await db.collection("shipments").findOne(
      { $or: [{ shipmentId: shipmentId }, { trackingNumber: trackingNumber }] },
      { projection: { _id: 0, invoice: 1 } }
    ) as any;
    const invoiceNumber = String(shipmentDoc?.invoice?.invoiceNumber || "").trim() || "—";

    // Fetch placeholder content
    const pcDoc = await db.collection("placeholder_content").findOne({ _id: "main" as any });
    const pc: Record<string, string> = (pcDoc?.content as Record<string, string>) || {};

    const trackUrl = `${APP_URL}/en/track/${encodeURIComponent(trackingNumber || shipmentId)}`;
    const invoiceUrl = `${APP_URL}/en/invoice/full?q=${encodeURIComponent(trackingNumber || shipmentId)}`;
    const supportUrl = `mailto:${SUPPORT_EMAIL}?subject=Support%20Request`;
    const signinUrl = `${APP_URL}/en/sign-in`;

    // Build badge HTML
    const badgeTextVal = String(template.badgeText || "").trim();
    const badgeToneVal = String(template.badgeTone || "blue").toLowerCase();
    const badgeColor = badgeToneVal === "green"
      ? { bg: "#dcfce7", text: "#166534" }
      : badgeToneVal === "red"
      ? { bg: "#fee2e2", text: "#b91c1c" }
      : { bg: "#dbeafe", text: "#1d4ed8" };
    const badgeHtml = badgeTextVal
      ? `<div style="margin:0 0 14px 0;"><span style="display:inline-block;background:${badgeColor.bg};color:${badgeColor.text};font-size:12px;font-weight:800;letter-spacing:.3px;padding:6px 12px;border-radius:999px;text-transform:uppercase;">${badgeTextVal}</span></div>`
      : "";

    // Build invoice link HTML
    const linkType = String(template.linkUrlType || "invoice").toLowerCase();
    const linkHref = linkType === "track" ? trackUrl
      : linkType === "support" ? supportUrl
      : linkType === "signin" ? signinUrl
      : linkType === "none" ? ""
      : invoiceUrl;
    const linkTextVal = String(template.linkText || "").trim();
    const invoiceLinkHtml = template.showLink !== false && linkHref && linkTextVal
      ? `<div style="margin-top:12px"><a href="${linkHref}" style="color:#2563eb;text-decoration:underline;font-weight:700;">${linkTextVal}</a></div>`
      : "";

    // Build details card HTML
    const detailsCardType = String(template.detailsCardType || "shipment").toLowerCase();
    let detailsCardHtml = "";
    if (template.showDetailsCard !== false && detailsCardType !== "none") {
      if (detailsCardType === "invoice") {
        detailsCardHtml = renderInfoCard([
          { label: "Shipment Number", value: shipmentId },
          { label: "Invoice Number", value: invoiceNumber },
          { label: "Status", value: String(shipmentDoc?.invoice?.status || "—").toUpperCase() },
        ]);
      } else if (detailsCardType === "account") {
        detailsCardHtml = renderInfoCard([
          { label: "Account Email", value: to },
        ]);
      } else {
        detailsCardHtml = renderDetailsCard({
          shipmentId,
          trackingNumber: trackingNumber || "—",
          invoiceNumber,
        });
      }
    }

    const vars: Record<string, string> = {
      name: esc(name),
      shipmentId: esc(shipmentId),
      trackingNumber: esc(trackingNumber || "—"),
      invoiceNumber: esc(invoiceNumber),
      email: esc(to),
      trackUrl,
      invoiceUrl,
      supportUrl,
      signinUrl,
      closingText: pc.default_closingText || "You can use the button below to take the next action on this shipment.",
      intro: pc.default_intro || "There has been an update to your shipment.",
      detail: pc.default_detail || "Please review the latest shipment information using the links below.",
      extra: pc.default_extra || "You will continue to receive updates as your shipment progresses.",
      invoiceMessage: pc.default_invoiceMessage || "There has been an update to the invoice for this shipment.",
      actionMessage: pc.default_actionMessage || "Please review the invoice details and take any necessary action.",
      paymentMessage: pc.default_paymentMessage || "Please complete any required payment so shipment processing can continue.",
      badge: badgeHtml,
      detailsCard: detailsCardHtml,
      invoiceLink: invoiceLinkHtml,
      changesTable: "",
      destinationBlock: "",
      noteBlock: "",
      otherPartyLine: "",
      invoiceStatus: "",
      estimatedDeliveryDate: "",
      receiverName: "",
      senderName: "",
      shortEmail: esc(to.length > 22 ? to.slice(0, 19) + "..." : to),
      status: "",
      destination: "",
      fullDestination: "",
      origin: "",
    };

    const subject = fillVars(template.subject || "Message from Exodus Logistics", vars);
    const title = fillVars(template.title || "Message", vars);
    const preheader = fillVars(template.preheader || "", vars);
    const bodyHtml = fillVars(template.bodyHtml || "", vars);

    const buttonType = String(template.buttonUrlType || "track").toLowerCase();
    const buttonHref = buttonType === "invoice" ? invoiceUrl
      : buttonType === "support" ? supportUrl
      : buttonType === "signin" ? signinUrl
      : buttonType === "none" ? ""
      : trackUrl;
    const buttonText = fillVars(template.buttonText || "View Shipment", vars);

    const html = renderEmailTemplate({
      subject,
      title,
      preheader,
      bodyHtml,
      button: template.showButton !== false && buttonHref ? { text: buttonText, href: buttonHref } : undefined,
      appUrl: APP_URL,
      supportEmail: SUPPORT_EMAIL,
      sentTo: to,
    });

    await resend.emails.send({
      from: RESEND_FROM,
      to,
      subject,
      replyTo: SUPPORT_EMAIL,
      html,
      text: toText(html),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to send email." }, { status: 500 });
  }
}