import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

const COLLECTION = "email_templates";

const DEFAULT_TEMPLATES = [
  {
    key: "shipment_created_sender",
    label: "Create Shipment Email (Sender)",
    category: "shipment",
    subject: "Shipment created: {{shipmentId}}",
    title: "Shipment created",
    preheader: "Shipment {{shipmentId}} has been created successfully.",
    bodyHtml: `
<p>Hello {{name}},</p>
<p>Your shipment <strong>{{shipmentId}}</strong> has been created successfully and is being prepared for delivery to <strong>{{receiverName}}</strong>.</p>
<p><strong>Invoice status:</strong> {{invoiceStatus}}<br/>
<strong>Estimated delivery date:</strong> {{estimatedDeliveryDate}}</p>
<p><strong>Shipment Number:</strong> <span style="white-space:nowrap;">{{shipmentId}}</span><br/>
<strong>Tracking Number:</strong> <span style="white-space:nowrap;">{{trackingNumber}}</span><br/>
<strong>Invoice Number:</strong> <span style="white-space:nowrap;">{{invoiceNumber}}</span></p>
<p>You can view the invoice from the link below.</p>`.trim(),
    buttonText: "View Shipment",
    buttonUrlType: "track",
  },
  {
    key: "shipment_created_receiver",
    label: "Create Shipment Email (Receiver)",
    category: "shipment",
    subject: "Shipment created for you: {{shipmentId}}",
    title: "Shipment created",
    preheader: "A shipment has been created for you.",
    bodyHtml: `
<p>Hello {{name}},</p>
<p>A shipment has been created for you by <strong>{{senderName}}</strong>.</p>
<p><strong>Invoice status:</strong> {{invoiceStatus}}<br/>
<strong>Estimated delivery date:</strong> {{estimatedDeliveryDate}}</p>
<p><strong>Shipment Number:</strong> <span style="white-space:nowrap;">{{shipmentId}}</span><br/>
<strong>Tracking Number:</strong> <span style="white-space:nowrap;">{{trackingNumber}}</span><br/>
<strong>Invoice Number:</strong> <span style="white-space:nowrap;">{{invoiceNumber}}</span></p>`.trim(),
    buttonText: "View Shipment",
    buttonUrlType: "track",
  },
  {
    key: "shipment_edited",
    label: "Shipment Edited Email",
    category: "shipment",
    subject: "Shipment details updated ({{shipmentId}})",
    title: "Shipment details updated",
    preheader: "Shipment {{shipmentId}} details have been updated.",
    bodyHtml: `
<p>Hello {{name}},</p>
<p>Some shipment details have been updated. Please review the latest shipment and invoice information.</p>
<p><strong>Shipment Number:</strong> <span style="white-space:nowrap;">{{shipmentId}}</span><br/>
<strong>Tracking Number:</strong> <span style="white-space:nowrap;">{{trackingNumber}}</span><br/>
<strong>Invoice Number:</strong> <span style="white-space:nowrap;">{{invoiceNumber}}</span></p>
<p>{{changesTable}}</p>`.trim(),
    buttonText: "View Shipment",
    buttonUrlType: "track",
  },
  {
    key: "invoice_status_update",
    label: "Invoice Status Update Email",
    category: "invoice",
    subject: "Invoice {{invoiceStatus}} ({{shipmentId}})",
    title: "Invoice update",
    preheader: "Invoice status has changed.",
    bodyHtml: `
<p>Hello {{name}},</p>
<p>The invoice for shipment <strong>{{shipmentId}}</strong> is now marked as <strong>{{invoiceStatus}}</strong>.</p>
<p><strong>Invoice Number:</strong> <span style="white-space:nowrap;">{{invoiceNumber}}</span></p>`.trim(),
    buttonText: "View Invoice",
    buttonUrlType: "invoice",
  },
];

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);
    const col = db.collection(COLLECTION);

    const existing = await col.find({}).project({ _id: 0 }).toArray();

    if (!existing.length) {
      const now = new Date();
      await col.insertMany(
        DEFAULT_TEMPLATES.map((t) => ({
          ...t,
          isCustom: false,
          createdAt: now,
          updatedAt: now,
        }))
      );
    }

    // sync timeline statuses into email_templates
    const statuses = await db
      .collection("statuses")
      .find({})
      .project({ _id: 0 })
      .toArray();

    for (const s of statuses) {
      const key = `timeline:${String((s as any).key || "").trim()}`;
      if (!key || key === "timeline:") continue;

      const exists = await col.findOne({ key });
      if (!exists) {
        await col.insertOne({
          key,
          label: `${String((s as any).label || "Timeline Stage").trim()} Email`,
          category: "timeline",
          subject:
            String((s as any).emailSubject || "").trim() ||
            `Shipment update: {{shipmentId}}`,
          title:
            String((s as any).emailTitle || "").trim() ||
            String((s as any).label || "Shipment update").trim(),
          preheader:
            String((s as any).emailPreheader || "").trim() ||
            `Shipment ${String((s as any).label || "update").trim()} update`,
          bodyHtml:
            String((s as any).emailBodyHtml || "").trim() ||
            `<p>Hello {{name}},</p>
<p>Your shipment <strong>{{shipmentId}}</strong> has been updated to <strong>{{status}}</strong>.</p>
<p><strong>Tracking Number:</strong> <span style="white-space:nowrap;">{{trackingNumber}}</span><br/>
<strong>Invoice Number:</strong> <span style="white-space:nowrap;">{{invoiceNumber}}</span><br/>
<strong>Destination:</strong> {{destination}}</p>
<p>{{note}}</p>`,
          buttonText:
            String((s as any).emailButtonText || "").trim() || "Track Shipment",
          buttonUrlType:
            String((s as any).emailButtonUrlType || "").trim() || "track",
          isCustom: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }

    const templates = await col
      .find({})
      .project({ _id: 0 })
      .sort({ category: 1, label: 1 })
      .toArray();

    return NextResponse.json({ templates });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to load email templates." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const key = String(body?.key || "").trim();
    if (!key) {
      return NextResponse.json({ error: "Template key is required." }, { status: 400 });
    }

    const doc = {
      key,
      label: String(body?.label || "").trim(),
      category: String(body?.category || "general").trim(),
      subject: String(body?.subject || "").trim(),
      title: String(body?.title || "").trim(),
      preheader: String(body?.preheader || "").trim(),
      bodyHtml: String(body?.bodyHtml || "").trim(),
      buttonText: String(body?.buttonText || "").trim(),
      buttonUrlType: String(body?.buttonUrlType || "track").trim(),
      isCustom: true,
      updatedAt: new Date(),
    };

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    /* ---------------------------
       TIMELINE TEMPLATE UPDATE
    ----------------------------*/
    if (key.startsWith("timeline:")) {

      const statusKey = key.replace("timeline:", "");

      await db.collection("statuses").updateOne(
        { key: statusKey },
        {
          $set: {
            emailSubject: doc.subject,
            emailTitle: doc.title,
            emailPreheader: doc.preheader,
            emailBodyHtml: doc.bodyHtml,
            emailButtonText: doc.buttonText,
            emailButtonUrlType: doc.buttonUrlType,
            updatedAt: new Date(),
          },
        }
      );

      return NextResponse.json({ ok: true });
    }

    /* ---------------------------
       NORMAL TEMPLATE SAVE
    ----------------------------*/
    await db.collection(COLLECTION).updateOne(
      { key },
      {
        $set: doc,
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true }
    );

    return NextResponse.json({ ok: true, template: doc });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to save email template." }, { status: 500 });
  }
}