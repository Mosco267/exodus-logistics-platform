import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { auth } from "@/auth";
import { sendEmail } from "@/lib/email";

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

    if (!subject) {
      return NextResponse.json({ error: "Subject is required." }, { status: 400 });
    }

    if (!message) {
      return NextResponse.json({ error: "Message is required." }, { status: 400 });
    }

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

    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827;">
        <h2 style="margin:0 0 16px 0;">${subject}</h2>

        <p style="margin:0 0 16px 0;white-space:pre-line;">${message}</p>

        <div style="margin:16px 0;padding:14px 16px;border:1px solid #e5e7eb;border-radius:12px;background:#f9fafb;">
          <p style="margin:0 0 8px 0;"><strong>Shipment ID:</strong> ${shipmentId}</p>
          <p style="margin:0 0 8px 0;"><strong>Tracking number:</strong> ${trackingNumber || "—"}</p>
          <p style="margin:0;"><strong>Invoice number:</strong> ${invoiceNumber || "—"}</p>
        </div>

        ${
          trackUrl
            ? `<p style="margin:0 0 10px 0;">
                 <a href="${trackUrl}" style="display:inline-block;padding:12px 16px;background:#2563eb;color:#fff;text-decoration:none;border-radius:10px;font-weight:600;">
                   Track Shipment
                 </a>
               </p>`
            : ""
        }

        ${
          invoiceUrl
            ? `<p style="margin:0 0 10px 0;">
                 <a href="${invoiceUrl}" style="display:inline-block;padding:12px 16px;background:#111827;color:#fff;text-decoration:none;border-radius:10px;font-weight:600;">
                   View Invoice
                 </a>
               </p>`
            : ""
        }

        <p style="margin-top:18px;color:#6b7280;font-size:12px;">
          Exodus Logistics
        </p>
      </div>
    `;

    await sendEmail(to, subject, html);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}