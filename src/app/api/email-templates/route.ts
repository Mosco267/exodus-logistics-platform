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
<strong>Estimated delivery date:</strong> {{estimatedDeliveryDate}}<br/>
{{paymentMessage}}</p>

<p><strong>Shipment Number:</strong> <span style="white-space:nowrap;word-break:keep-all;">{{shipmentId}}</span><br/>
<strong>Tracking Number:</strong> <span style="white-space:nowrap;word-break:keep-all;">{{trackingNumber}}</span><br/>
<strong>Invoice Number:</strong> <span style="white-space:nowrap;word-break:keep-all;">{{invoiceNumber}}</span></p>

<p>You can view the invoice from the link below.</p>

<div style="margin-top:12px;">
  <a href="{{invoiceUrl}}" style="color:#2563eb;text-decoration:underline;font-weight:600;">View Invoice</a>
</div>
`.trim(),
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
<strong>Estimated delivery date:</strong> {{estimatedDeliveryDate}}<br/>
{{paymentMessage}}</p>

<p><strong>Shipment Number:</strong> <span style="white-space:nowrap;word-break:keep-all;">{{shipmentId}}</span><br/>
<strong>Tracking Number:</strong> <span style="white-space:nowrap;word-break:keep-all;">{{trackingNumber}}</span><br/>
<strong>Invoice Number:</strong> <span style="white-space:nowrap;word-break:keep-all;">{{invoiceNumber}}</span></p>

<div style="margin-top:12px;">
  <a href="{{invoiceUrl}}" style="color:#2563eb;text-decoration:underline;font-weight:600;">View Invoice</a>
</div>
`.trim(),
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
<p>{{intro}}</p>

<p><strong>Shipment Number:</strong> <span style="white-space:nowrap;word-break:keep-all;">{{shipmentId}}</span><br/>
<strong>Tracking Number:</strong> <span style="white-space:nowrap;word-break:keep-all;">{{trackingNumber}}</span><br/>
<strong>Invoice Number:</strong> <span style="white-space:nowrap;word-break:keep-all;">{{invoiceNumber}}</span></p>

{{changesTable}}

<div style="margin-top:12px;">
  <a href="{{invoiceUrl}}" style="color:#2563eb;text-decoration:underline;font-weight:600;">View Invoice</a>
</div>
`.trim(),
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
<p>{{invoiceMessage}}</p>
<p><strong>Invoice Number:</strong> <span style="white-space:nowrap;word-break:keep-all;">{{invoiceNumber}}</span></p>
`.trim(),
    buttonText: "View Invoice",
    buttonUrlType: "invoice",
  },

  {
    key: "shipment_deleted",
    label: "Deleted Shipment Email",
    category: "shipment",
    subject: "Shipment record removed ({{shipmentId}})",
    title: "Shipment removed",
    preheader: "Shipment {{shipmentId}} has been removed from tracking.",
    bodyHtml: `
<p>Hello {{name}},</p>
<p>Please be informed that the shipment record for <strong>{{shipmentId}}</strong> has been removed from our tracking system.</p>
<p>As a result, this shipment will no longer be available for tracking on our website.</p>
<p><strong>Shipment Number:</strong> <span style="white-space:nowrap;word-break:keep-all;">{{shipmentId}}</span><br/>
<strong>Tracking Number:</strong> <span style="white-space:nowrap;word-break:keep-all;">{{trackingNumber}}</span></p>
<p>If you believe this action was made in error or you need further clarification, please contact our support team.</p>
`.trim(),
    buttonText: "Contact support",
    buttonUrlType: "support",
  },

  {
    key: "user_deleted",
    label: "Deleted User Email",
    category: "account",
    subject: "Exodus Logistics: Account deleted",
    title: "Account deleted",
    preheader: "Your account has been deleted.",
    bodyHtml: `
<p>Hello {{name}},</p>
<p>This email confirms that the Exodus Logistics account associated with <strong>{{email}}</strong> has been deleted by an administrator.</p>
<p>If you believe this action was taken in error, please contact our support team for assistance.</p>
`.trim(),
    buttonText: "Contact support",
    buttonUrlType: "support",
  },

  {
    key: "user_banned",
    label: "Banned User Email",
    category: "account",
    subject: "Exodus Logistics: Account access removed",
    title: "Account access removed",
    preheader: "Your account access has been removed.",
    bodyHtml: `
<p>Hello {{name}},</p>
<p>This email confirms that the Exodus Logistics account associated with <strong>{{email}}</strong> has been permanently banned due to a violation of our policies.</p>
<p>Access has been removed, and you will not be able to register another account using this email address.</p>
`.trim(),
    buttonText: "Contact support",
    buttonUrlType: "support",
  },

  {
    key: "user_restored",
    label: "Restored User Email",
    category: "account",
    subject: "Exodus Logistics: Update on your account",
    title: "Account access restored",
    preheader: "Your account access has been restored.",
    bodyHtml: `
<p>Hello {{name}},</p>
<p>This is to confirm that access to the Exodus Logistics account associated with <strong>{{email}}</strong> has been restored.</p>
<p>We apologize for any inconvenience this may have caused.</p>
<p>If you experience any issues signing in, please reply to this email or contact our support team.</p>
`.trim(),
    buttonText: "Contact support",
    buttonUrlType: "support",
  },
];

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);
    const col = db.collection(COLLECTION);

    const existing = await col.find({}).project({ _id: 0 }).toArray();
const existingKeys = new Set(existing.map((t: any) => String(t.key || "").trim()));

const missingDefaults = DEFAULT_TEMPLATES.filter((t) => !existingKeys.has(t.key));

if (missingDefaults.length) {
  const now = new Date();
  await col.insertMany(
    missingDefaults.map((t) => ({
      ...t,
      isCustom: false,
      createdAt: now,
      updatedAt: now,
    }))
  );
}

    // sync timeline statuses into email_templates
    

   const statuses = await db.collection("statuses").find({}).project({ _id: 0 }).toArray();

const timelineTemplates = statuses
  .filter((s: any) => s?.emailSubject || s?.emailBodyHtml || s?.emailTitle)
  .map((s: any) => ({
    key: `timeline:${String(s.key || "").trim()}`,
    label: `${String(s.label || "Timeline Stage").trim()} Timeline Email`,
    category: "timeline",
    subject: String(s.emailSubject || `Shipment update (${s.label})`).trim(),
    title: String(s.emailTitle || s.label || "Shipment update").trim(),
    preheader: String(s.emailPreheader || "").trim(),
    bodyHtml: String(s.emailBodyHtml || "").trim(),
    buttonText: String(s.emailButtonText || "Track Shipment").trim(),
    buttonUrlType: String(s.emailButtonUrlType || "track").trim(),
    isCustom: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));

for (const t of timelineTemplates) {
  await col.updateOne(
    { key: t.key },
    {
      $set: {
        label: t.label,
        category: t.category,
        subject: t.subject,
        title: t.title,
        preheader: t.preheader,
        bodyHtml: t.bodyHtml,
        buttonText: t.buttonText,
        buttonUrlType: t.buttonUrlType,
        isCustom: true,
        updatedAt: new Date(),
      },
      $setOnInsert: {
        createdAt: new Date(),
      },
    },
    { upsert: true }
  );
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