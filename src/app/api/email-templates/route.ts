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
{{badge}}

<p style="margin:0 0 16px 0;font-size:16px;line-height:26px;color:#111827;">
Hello {{name}},
</p>

<p style="margin:0 0 14px 0;font-size:16px;line-height:26px;color:#111827;">
Your shipment <strong>{{shipmentId}}</strong> has been created successfully and is being prepared for delivery to <strong>{{receiverName}}</strong>.
</p>

<p style="margin:0 0 14px 0;font-size:16px;line-height:26px;color:#111827;">
We have generated the shipment record and invoice details, and our system is ready to move this shipment through the next processing stage as soon as all requirements are satisfied.
</p>

<p style="margin:0 0 18px 0;font-size:16px;line-height:26px;color:#111827;">
<strong>Invoice status:</strong> <strong>{{invoiceStatus}}</strong><br/>
<strong>Estimated delivery date:</strong> {{estimatedDeliveryDate}}<br/>
{{paymentMessage}}
</p>

{{detailsCard}}

<p style="margin:20px 0 0 0;font-size:15px;line-height:24px;color:#6b7280;">
You can use the button below to open the shipment page for tracking updates. You can also use the invoice link below to review billing details.
</p>

{{invoiceLink}}
`.trim(),
    buttonText: "View Shipment",
    buttonUrlType: "track",
    badgeText: "",
    badgeTone: "",
    showButton: true,
    showLink: true,
    linkText: "View Invoice",
    linkUrlType: "invoice",
    showDetailsCard: true,
    detailsCardType: "shipment",
  },

  {
    key: "shipment_created_receiver",
    label: "Create Shipment Email (Receiver)",
    category: "shipment",
    subject: "Shipment created for you: {{shipmentId}}",
    title: "Shipment created",
    preheader: "A shipment has been created for you.",
    bodyHtml: `
{{badge}}

<p style="margin:0 0 16px 0;font-size:16px;line-height:26px;color:#111827;">
Hello {{name}},
</p>

<p style="margin:0 0 14px 0;font-size:16px;line-height:26px;color:#111827;">
A shipment has been created for you by <strong>{{senderName}}</strong>.
</p>

<p style="margin:0 0 14px 0;font-size:16px;line-height:26px;color:#111827;">
Our system has recorded the shipment successfully, and the shipment details are now available for invoice review and tracking updates.
</p>

<p style="margin:0 0 18px 0;font-size:16px;line-height:26px;color:#111827;">
<strong>Invoice status:</strong> <strong>{{invoiceStatus}}</strong><br/>
<strong>Estimated delivery date:</strong> {{estimatedDeliveryDate}}<br/>
{{paymentMessage}}
</p>

{{detailsCard}}

<p style="margin:20px 0 0 0;font-size:15px;line-height:24px;color:#6b7280;">
You can use the button below to open the shipment page and monitor future progress updates. You can also use the invoice link below to review billing details.
</p>

{{invoiceLink}}
`.trim(),
    buttonText: "View Shipment",
    buttonUrlType: "track",
    badgeText: "",
    badgeTone: "",
    showButton: true,
    showLink: true,
    linkText: "View Invoice",
    linkUrlType: "invoice",
    showDetailsCard: true,
    detailsCardType: "shipment",
  },

  {
    key: "shipment_edited",
    label: "Shipment Edited Email",
    category: "shipment",
    subject: "Shipment details updated ({{shipmentId}})",
    title: "Shipment details updated",
    preheader: "Shipment {{shipmentId}} details have been updated.",
    bodyHtml: `
{{badge}}

<p>Hello {{name}},</p>
<p>{{intro}}</p>

<p>This update may affect delivery planning, shipment records, or invoice-related references. We recommend keeping a copy of the updated details for future tracking and verification.</p>

{{detailsCard}}

{{changesTable}}

<p>You can use the button below to open the shipment page and review the latest details. You can also use the invoice link below if billing verification is needed.</p>

{{invoiceLink}}
`.trim(),
    buttonText: "View Shipment",
    buttonUrlType: "track",
    badgeText: "Shipment Updated",
    badgeTone: "blue",
    showButton: true,
    showLink: true,
    linkText: "View Invoice",
    linkUrlType: "invoice",
    showDetailsCard: true,
    detailsCardType: "shipment",
  },

  {
    key: "invoice_status_update",
    label: "Invoice Status Update Email",
    category: "invoice",
    subject: "Invoice {{invoiceStatus}} ({{shipmentId}})",
    title: "Invoice update",
    preheader: "Invoice status has changed.",
    bodyHtml: `
{{badge}}

<p>Hello {{name}},</p>

<p>The invoice for shipment <strong>{{shipmentId}}</strong> is now marked as <strong>{{invoiceStatus}}</strong>.</p>

<p>{{invoiceMessage}}</p>

<p>Please review the invoice details below and take any required action promptly so there is no unnecessary interruption to shipment processing.</p>

{{detailsCard}}
`.trim(),
    buttonText: "View Invoice",
    buttonUrlType: "invoice",
    badgeText: "Invoice Update",
    badgeTone: "blue",
    showButton: true,
    showLink: false,
    linkText: "View Invoice",
    linkUrlType: "invoice",
    showDetailsCard: true,
    detailsCardType: "invoice",
  },

  {
    key: "shipment_deleted",
    label: "Deleted Shipment Email",
    category: "shipment",
    subject: "Shipment record removed ({{shipmentId}})",
    title: "Shipment removed",
    preheader: "Shipment {{shipmentId}} has been removed from tracking.",
    bodyHtml: `
{{badge}}

<p>Hello {{name}},</p>

<p>Please be informed that the shipment record for <strong>{{shipmentId}}</strong> has been removed from our tracking system.</p>

<p>As a result, this shipment will no longer be available for tracking on our website, and any further automated progress notifications for this shipment will stop.</p>

{{detailsCard}}

<p>If you believe this action was made in error or need more clarification, please contact our support team.</p>
`.trim(),
    buttonText: "Contact support",
    buttonUrlType: "support",
    badgeText: "Shipment Removed",
    badgeTone: "red",
    showButton: true,
    showLink: false,
    linkText: "",
    linkUrlType: "support",
    showDetailsCard: true,
    detailsCardType: "shipment",
  },

  {
    key: "user_deleted",
    label: "Deleted User Email",
    category: "account",
    subject: "Exodus Logistics: Account deleted",
    title: "Account deleted",
    preheader: "Your account has been deleted.",
    bodyHtml: `
{{badge}}

<p>Hello {{name}},</p>

<p>This email confirms that the Exodus Logistics account associated with <strong>{{email}}</strong> has been deleted by an administrator.</p>

<p>As a result, access to the account and any related account functions have been removed. If this action was not expected, please contact our support team for review and clarification.</p>

{{detailsCard}}

<p>Our support team will assist you if you believe this action was taken in error.</p>
`.trim(),
    buttonText: "Contact support",
    buttonUrlType: "support",
    badgeText: "Account Deleted",
    badgeTone: "red",
    showButton: true,
    showLink: false,
    linkText: "",
    linkUrlType: "support",
    showDetailsCard: true,
    detailsCardType: "account",
  },

  {
    key: "user_banned",
    label: "Banned User Email",
    category: "account",
    subject: "Exodus Logistics: Account access removed",
    title: "Account access removed",
    preheader: "Your account access has been removed.",
    bodyHtml: `
{{badge}}

<p>Hello {{name}},</p>

<p>This email confirms that the Exodus Logistics account associated with <strong>{{email}}</strong> has been permanently banned due to a violation of our policies.</p>

<p>Access to the account has been removed immediately, and you will no longer be able to sign in or create another account using this email address unless a formal review is completed and approved.</p>

{{detailsCard}}

<p>If you believe this action was made in error, please contact support to request a review.</p>
`.trim(),
    buttonText: "Contact support",
    buttonUrlType: "support",
    badgeText: "Account Banned",
    badgeTone: "red",
    showButton: true,
    showLink: false,
    linkText: "",
    linkUrlType: "support",
    showDetailsCard: true,
    detailsCardType: "account",
  },

  {
    key: "user_restored",
    label: "Restored User Email",
    category: "account",
    subject: "Exodus Logistics: Update on your account",
    title: "Account access restored",
    preheader: "Your account access has been restored.",
    bodyHtml: `
{{badge}}

<p>Hello {{name}},</p>

<p>This is to confirm that access to the Exodus Logistics account associated with <strong>{{email}}</strong> has been restored successfully.</p>

<p>You may now sign in again and continue using your account normally. We apologize for any inconvenience this may have caused.</p>

{{detailsCard}}

<p>If you experience any sign-in difficulty or notice account activity you do not recognize, please contact support immediately.</p>
`.trim(),
    buttonText: "Contact support",
    buttonUrlType: "support",
    badgeText: "Account Restored",
    badgeTone: "green",
    showButton: true,
    showLink: false,
    linkText: "",
    linkUrlType: "support",
    showDetailsCard: true,
    detailsCardType: "account",
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

    const statuses = await db
      .collection("statuses")
      .find({})
      .project({ _id: 0 })
      .toArray();

    const now = new Date();

    const timelineTemplates = statuses.map((s: any) => ({
      key: `timeline:${String(s.key || "").trim()}`,
      label: `Timeline: ${String(s.label || "Timeline Stage").trim()}`,
      category: "timeline",
      subject: String(s.emailSubject || `Shipment update: {{shipmentId}}`).trim(),
      title: String(s.emailTitle || s.label || "Shipment update").trim(),
      preheader:
        String(s.emailPreheader || `Shipment ${String(s.label || "update").trim()} update`).trim(),
      bodyHtml:
        String(s.emailBodyHtml || "").trim() ||
        `<p>Hello {{name}},</p>
<p>Your shipment <strong>{{shipmentId}}</strong> has been updated to <strong>{{status}}</strong>.</p>
<p><strong>Tracking Number:</strong> <span style="white-space:nowrap;">{{trackingNumber}}</span><br/>
<strong>Invoice Number:</strong> <span style="white-space:nowrap;">{{invoiceNumber}}</span><br/>
<strong>Destination:</strong> {{destination}}</p>
<p>{{note}}</p>`,
      buttonText: String(s.emailButtonText || "Track Shipment").trim(),
      buttonUrlType: String(s.emailButtonUrlType || "track").trim(),
      badgeText: String(s.badgeText || s.label || "Shipment Update").trim(),
      badgeTone: String(s.badgeTone ?? "").trim(),
      showButton: typeof s.showButton === "boolean" ? s.showButton : true,
      showLink: typeof s.showLink === "boolean" ? s.showLink : true,
      linkText: String(s.linkText || "View Invoice").trim(),
      linkUrlType: String(s.linkUrlType || "invoice").trim(),
      showDetailsCard: typeof s.showDetailsCard === "boolean" ? s.showDetailsCard : true,
      detailsCardType: String(s.detailsCardType || "shipment").trim(),
      isCustom: true,
      updatedAt: now,
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
            badgeText: t.badgeText,
            badgeTone: t.badgeTone,
            showButton: t.showButton,
            showLink: t.showLink,
            linkText: t.linkText,
            linkUrlType: t.linkUrlType,
            showDetailsCard: t.showDetailsCard,
            detailsCardType: t.detailsCardType,
            isCustom: true,
            updatedAt: now,
          },
          $setOnInsert: {
            createdAt: now,
          },
        },
        { upsert: true }
      );
    }

    await col.deleteMany({
      category: "timeline",
      label: { $not: /^Timeline:\s/i },
    });

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
      badgeText: String(body?.badgeText || "").trim(),
      badgeTone: String(body?.badgeTone ?? "").trim(),
      showButton: typeof body?.showButton === "boolean" ? body.showButton : true,
      showLink: typeof body?.showLink === "boolean" ? body.showLink : true,
      linkText: String(body?.linkText || "").trim(),
      linkUrlType: String(body?.linkUrlType || "invoice").trim(),
      showDetailsCard: typeof body?.showDetailsCard === "boolean" ? body.showDetailsCard : true,
      detailsCardType: String(body?.detailsCardType || "shipment").trim(),
      isCustom: true,
      updatedAt: new Date(),
    };

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

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
            badgeText: doc.badgeText,
            badgeTone: doc.badgeTone,
            showButton: doc.showButton,
            showLink: doc.showLink,
            linkText: doc.linkText,
            linkUrlType: doc.linkUrlType,
            showDetailsCard: doc.showDetailsCard,
            detailsCardType: doc.detailsCardType,
            updatedAt: new Date(),
          },
        }
      );

      await db.collection(COLLECTION).updateOne(
        { key },
        {
          $set: {
            ...doc,
            label:
              `Timeline: ${String(body?.label || "").replace(/^Timeline:\s*/i, "").trim()}` ||
              doc.label,
            category: "timeline",
          },
          $setOnInsert: { createdAt: new Date() },
        },
        { upsert: true }
      );

      return NextResponse.json({ ok: true });
    }

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