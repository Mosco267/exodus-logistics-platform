import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { auth } from "@/auth";
import { sendEmail } from "@/lib/email";
import { renderEmailTemplate } from "@/lib/emailTemplate";

function normalizeShipmentId(value: string) {
  return decodeURIComponent(value).trim();
}

function escapeRegex(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function shipmentIdQuery(id: string) {
  return { shipmentId: { $regex: `^${escapeRegex(id)}$`, $options: "i" } };
}

function cleanStr(v: any) {
  return String(v ?? "").trim();
}

function esc(s: string) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildTrackUrl(trackingNumber: string) {
  const base = (
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://www.goexoduslogistics.com"
  ).replace(/\/$/, "");
  return `${base}/en/track/${encodeURIComponent(trackingNumber)}`;
}

function buildInvoiceUrl(trackingNumber: string) {
  const base = (
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://www.goexoduslogistics.com"
  ).replace(/\/$/, "");
  return `${base}/en/invoice/full?q=${encodeURIComponent(trackingNumber)}`;
}

const APP_URL = (
  process.env.APP_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "https://www.goexoduslogistics.com"
).replace(/\/$/, "");

const SUPPORT_EMAIL =
  process.env.SUPPORT_EMAIL || "support@goexoduslogistics.com";

export async function POST(
  req: Request,
  context: { params: Promise<{ shipmentId: string }> }
) {
  try {
    const session = await auth();
    const role = String((session as any)?.user?.role || "").toUpperCase();
    if (role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { shipmentId: raw } = await context.params;
    const shipmentId = normalizeShipmentId(raw);

    const body = await req.json().catch(() => null);

    const recipientType = cleanStr(body?.recipientType || "receiver").toLowerCase();
    const customEmail = cleanStr(body?.email).toLowerCase();
    const subject = cleanStr(body?.subject);
    const message = cleanStr(body?.message);

    if (!subject) return NextResponse.json({ error: "Subject is required." }, { status: 400 });
    if (!message) return NextResponse.json({ error: "Message is required." }, { status: 400 });

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    const shipment = await db.collection("shipments").findOne(shipmentIdQuery(shipmentId), {
      projection: { _id: 0 },
    });

    if (!shipment) {
      return NextResponse.json({ error: "Shipment not found." }, { status: 404 });
    }

    const s: any = shipment;

    const receiverEmail = cleanStr(s?.receiverEmail).toLowerCase();
    const senderEmail = cleanStr(s?.senderEmail || s?.createdByEmail).toLowerCase();
    const recipientName = recipientType === "sender"
      ? cleanStr(s?.senderName) || "Customer"
      : cleanStr(s?.receiverName) || "Customer";

    let to = "";
    if (customEmail) {
      to = customEmail;
    } else if (recipientType === "sender") {
      to = senderEmail;
    } else {
      to = receiverEmail;
    }

    if (!to) {
      return NextResponse.json(
        { error: "No email address found for the selected recipient." },
        { status: 400 }
      );
    }

    const trackingNumber = cleanStr(s?.trackingNumber);
    const invoiceNumber = cleanStr(s?.invoice?.invoiceNumber);
    const trackUrl = trackingNumber ? buildTrackUrl(trackingNumber) : "";
    const invoiceUrl = trackingNumber ? buildInvoiceUrl(trackingNumber) : "";

    // Build message body with the same pattern as other system emails
    const messageHtml = message
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\n/g, "<br/>");

    // Shipment details card
    const detailsCardHtml = `
      <table
        role="presentation"
        align="center"
        width="100%"
        cellspacing="0"
        cellpadding="0"
        style="margin:22px auto 0 auto;border-collapse:separate;width:100%;max-width:560px;background:#f8fafc;border:1px solid #e5e7eb;border-radius:16px;"
      >
        <tr>
          <td style="padding:14px 20px;border-radius:16px;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0"
              style="border-collapse:collapse;width:100%;table-layout:fixed;">
              <tr>
                <td style="padding:8px 0;font-size:12px;line-height:18px;color:#6b7280;font-weight:600;white-space:nowrap;width:45%;">
                  Shipment Number:
                </td>
                <td align="right" style="padding:8px 0;font-size:12px;line-height:18px;color:#1d4ed8;font-weight:800;white-space:nowrap;width:55%;">
                  ${esc(shipmentId)}
                </td>
              </tr>
              <tr>
                <td style="padding:8px 0;font-size:12px;line-height:18px;color:#6b7280;font-weight:600;white-space:nowrap;width:45%;">
                  Tracking Number:
                </td>
                <td align="right" style="padding:8px 0;font-size:12px;line-height:18px;color:#1d4ed8;font-weight:800;white-space:nowrap;width:55%;">
                  ${esc(trackingNumber || "—")}
                </td>
              </tr>
              <tr>
                <td style="padding:8px 0;font-size:12px;line-height:18px;color:#6b7280;font-weight:600;white-space:nowrap;width:45%;">
                  Invoice Number:
                </td>
                <td align="right" style="padding:8px 0;font-size:12px;line-height:18px;color:#1d4ed8;font-weight:800;white-space:nowrap;width:55%;">
                  ${esc(invoiceNumber || "—")}
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    `;

    // Invoice link
    const invoiceLinkHtml = invoiceUrl
      ? `
        <div style="margin-top:12px;">
          <a href="${invoiceUrl}" style="color:#2563eb;text-decoration:underline;font-weight:700;font-size:14px;">
            View Invoice
          </a>
        </div>
      `
      : "";

    const bodyHtml = `
      <p style="margin:0 0 16px 0;font-size:16px;line-height:26px;color:#111827;">
        Hello ${esc(recipientName)},
      </p>

      <p style="margin:0 0 18px 0;font-size:16px;line-height:26px;color:#111827;">
        ${messageHtml}
      </p>

      ${detailsCardHtml}

      <p style="margin:20px 0 0 0;font-size:15px;line-height:24px;color:#6b7280;">
        You can use the button below to open the shipment tracking page. You can also use the invoice link to review billing details.
      </p>

      ${invoiceLinkHtml}
    `;

    const html = renderEmailTemplate({
      subject,
      title: subject,
      preheader: `${subject} — Shipment ${shipmentId}`,
      bodyHtml,
      button: trackUrl
        ? { text: "Track Shipment", href: trackUrl }
        : undefined,
      appUrl: APP_URL,
      supportEmail: SUPPORT_EMAIL,
      sentTo: to,
    });

    await sendEmail(to, subject, html);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}