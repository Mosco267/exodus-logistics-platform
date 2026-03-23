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

    // Fetch placeholder content
    const pcDoc = await db.collection("placeholder_content").findOne({ _id: "main" as any });
    const pc: Record<string, string> = (pcDoc?.content as Record<string, string>) || {};

    const trackUrl = `${APP_URL}/en/track/${encodeURIComponent(trackingNumber || shipmentId)}`;
    const invoiceUrl = `${APP_URL}/en/invoice/full?q=${encodeURIComponent(trackingNumber || shipmentId)}`;
    const supportUrl = `mailto:${SUPPORT_EMAIL}?subject=Support%20Request`;

    const vars: Record<string, string> = {
      name: esc(name),
      shipmentId: esc(shipmentId),
      trackingNumber: esc(trackingNumber || "—"),
      email: esc(to),
      trackUrl,
      invoiceUrl,
      supportUrl,
      closingText: pc.default_closingText || "You can use the button below to take the next action on this shipment.",
      intro: pc.default_intro || "There has been an update to your shipment.",
      detail: pc.default_detail || "Please review the latest shipment information using the links below.",
      extra: pc.default_extra || "You will continue to receive updates as your shipment progresses.",
      invoiceMessage: pc.default_invoiceMessage || "There has been an update to the invoice for this shipment.",
      actionMessage: pc.default_actionMessage || "Please review the invoice details and take any necessary action.",
      paymentMessage: pc.default_paymentMessage || "Please complete any required payment so shipment processing can continue.",
      badge: "",
      detailsCard: "",
      invoiceLink: "",
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

    const subject = fillVars(template.subject || `Message from Exodus Logistics`, vars);
    const title = fillVars(template.title || "Message", vars);
    const preheader = fillVars(template.preheader || "", vars);
    const bodyHtml = fillVars(template.bodyHtml || "", vars);

    const buttonType = String(template.buttonUrlType || "track").toLowerCase();
    const buttonHref = buttonType === "invoice" ? invoiceUrl : buttonType === "support" ? supportUrl : buttonType === "none" ? "" : trackUrl;
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