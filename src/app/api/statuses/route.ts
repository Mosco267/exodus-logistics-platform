import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

const normalizeKey = (v: string) =>
  (v ?? "").toLowerCase().trim().replace(/[\s_-]+/g, "");

const DEFAULT_STATUSES = [
  {
    key: "created",
    label: "Created",
    color: "slate",
    icon: "package",
    defaultUpdate: "Shipment has been created and is being processed.",
    nextStep: "Dispatch will be scheduled once processing is complete.",
    emailSubject: "Shipment created: {{shipmentId}}",
    emailTitle: "Shipment created",
    emailPreheader: "Shipment {{shipmentId}} has been created successfully.",
    emailBodyHtml: `
<p>Hello {{name}},</p>

<p>Your shipment <strong>{{shipmentId}}</strong> has been created successfully and is now being processed by our logistics team.</p>

<div style="margin:0 0 18px 0;padding:8px 0 0 0;background:#ffffff;">
  <p style="margin:0 0 10px 0;font-size:15px;line-height:24px;color:#111827;">
    <strong>Tracking Number:</strong>
    <span style="white-space:nowrap;word-break:keep-all;">{{trackingNumber}}</span>
  </p>

  <p style="margin:0 0 10px 0;font-size:15px;line-height:24px;color:#111827;">
    <strong>Invoice Number:</strong>
    <span style="white-space:nowrap;word-break:keep-all;">{{invoiceNumber}}</span>
  </p>

  <p style="margin:0;font-size:15px;line-height:24px;color:#111827;">
    <strong>Destination:</strong> {{destination}}
  </p>
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
    color: "green",
    icon: "package",
    defaultUpdate: "Shipment has been picked up successfully and entered into our logistics network.",
    nextStep: "The shipment will move to warehouse processing shortly.",
    emailSubject: "Shipment picked up: {{shipmentId}}",
    emailTitle: "Shipment picked up",
    emailPreheader: "Your shipment has been picked up successfully.",
    emailBodyHtml: `
<p>Hello {{name}},</p>

<p>We are pleased to inform you that your shipment <strong>{{shipmentId}}</strong> has been successfully picked up and entered into our logistics network.</p>

<p>The shipment is now being processed for movement from <strong>{{origin}}</strong> toward <strong>{{destination}}</strong>.</p>

<div style="margin:0 0 18px 0;padding:8px 0 0 0;background:#ffffff;">
  <p style="margin:0 0 10px 0;font-size:15px;line-height:24px;color:#111827;">
    <strong>Shipment Number:</strong>
    <span style="white-space:nowrap;word-break:keep-all;">{{shipmentId}}</span>
  </p>

  <p style="margin:0 0 10px 0;font-size:15px;line-height:24px;color:#111827;">
    <strong>Tracking Number:</strong>
    <span style="white-space:nowrap;word-break:keep-all;">{{trackingNumber}}</span>
  </p>

  <p style="margin:0;font-size:15px;line-height:24px;color:#111827;">
    <strong>Invoice Number:</strong>
    <span style="white-space:nowrap;word-break:keep-all;">{{invoiceNumber}}</span>
  </p>
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
    color: "cyan",
    icon: "warehouse",
    defaultUpdate: "Shipment has arrived at our warehouse facility for handling and preparation.",
    nextStep: "The shipment will move to transit after warehouse processing.",
    emailSubject: "Shipment received at warehouse: {{shipmentId}}",
    emailTitle: "Shipment received at warehouse",
    emailPreheader: "Your shipment is now at our warehouse facility.",
    emailBodyHtml: `
<p>Hello {{name}},</p>

<p>Your shipment <strong>{{shipmentId}}</strong> has been received at our warehouse facility.</p>

<p>It is currently undergoing internal handling and preparation before moving to the next shipping stage toward <strong>{{destination}}</strong>.</p>

<div style="margin:0 0 18px 0;padding:8px 0 0 0;background:#ffffff;">
  <p style="margin:0 0 10px 0;font-size:15px;line-height:24px;color:#111827;">
    <strong>Shipment Number:</strong>
    <span style="white-space:nowrap;word-break:keep-all;">{{shipmentId}}</span>
  </p>

  <p style="margin:0 0 10px 0;font-size:15px;line-height:24px;color:#111827;">
    <strong>Tracking Number:</strong>
    <span style="white-space:nowrap;word-break:keep-all;">{{trackingNumber}}</span>
  </p>

  <p style="margin:0;font-size:15px;line-height:24px;color:#111827;">
    <strong>Invoice Number:</strong>
    <span style="white-space:nowrap;word-break:keep-all;">{{invoiceNumber}}</span>
  </p>
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
    color: "blue",
    icon: "truck",
    defaultUpdate: "Shipment is in transit and moving toward the destination.",
    nextStep: "Continue tracking for real-time movement updates.",
    emailSubject: "Shipment in transit: {{shipmentId}}",
    emailTitle: "Shipment in transit",
    emailPreheader: "Your shipment is currently in transit.",
    emailBodyHtml: `
<p>Hello {{name}},</p>

<p>Your shipment <strong>{{shipmentId}}</strong> is now <strong>in transit</strong>.</p>

<p>It is currently moving toward <strong>{{destination}}</strong> from <strong>{{origin}}</strong>.</p>

<div style="margin:0 0 18px 0;padding:8px 0 0 0;background:#ffffff;">
  <p style="margin:0 0 10px 0;font-size:15px;line-height:24px;color:#111827;">
    <strong>Shipment Number:</strong>
    <span style="white-space:nowrap;word-break:keep-all;">{{shipmentId}}</span>
  </p>

  <p style="margin:0 0 10px 0;font-size:15px;line-height:24px;color:#111827;">
    <strong>Tracking Number:</strong>
    <span style="white-space:nowrap;word-break:keep-all;">{{trackingNumber}}</span>
  </p>

  <p style="margin:0;font-size:15px;line-height:24px;color:#111827;">
    <strong>Invoice Number:</strong>
    <span style="white-space:nowrap;word-break:keep-all;">{{invoiceNumber}}</span>
  </p>
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
    color: "purple",
    icon: "route",
    defaultUpdate: "Shipment is out for final delivery.",
    nextStep: "Please be available to receive or pick up the shipment.",
    emailSubject: "Out for delivery: {{shipmentId}}",
    emailTitle: "Shipment out for delivery",
    emailPreheader: "Your shipment is now on its final delivery route.",
    emailBodyHtml: `
<p>Hello {{name}},</p>

<p>Your shipment <strong>{{shipmentId}}</strong> is now <strong>out for delivery</strong>.</p>

<p>Our delivery process is in progress and the shipment is on its final route to the delivery address below.</p>

<p style="margin:0 0 16px 0;font-size:15px;line-height:24px;color:#111827;">
  <strong>Delivery Address:</strong><br/>
  {{destination}}
</p>

<p>Please make sure you are available and prepared to receive or pick up the shipment once delivery is completed.</p>

<div style="margin:0 0 18px 0;padding:8px 0 0 0;background:#ffffff;">
  <p style="margin:0 0 10px 0;font-size:15px;line-height:24px;color:#111827;">
    <strong>Shipment Number:</strong>
    <span style="white-space:nowrap;word-break:keep-all;">{{shipmentId}}</span>
  </p>

  <p style="margin:0 0 10px 0;font-size:15px;line-height:24px;color:#111827;">
    <strong>Tracking Number:</strong>
    <span style="white-space:nowrap;word-break:keep-all;">{{trackingNumber}}</span>
  </p>

  <p style="margin:0;font-size:15px;line-height:24px;color:#111827;">
    <strong>Invoice Number:</strong>
    <span style="white-space:nowrap;word-break:keep-all;">{{invoiceNumber}}</span>
  </p>
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
    color: "orange",
    icon: "shield",
    defaultUpdate: "Shipment is undergoing customs clearance. Additional verification may be required.",
    nextStep: "We will update you once customs clearance is completed.",
    emailSubject: "Customs clearance update: {{shipmentId}}",
    emailTitle: "Shipment under customs clearance",
    emailPreheader: "Your shipment is undergoing customs clearance.",
    emailBodyHtml: `
<p>Hello {{name}},</p>

<p>Your shipment <strong>{{shipmentId}}</strong> is currently undergoing <strong>customs clearance</strong>.</p>

<p>This is a routine compliance stage before the shipment proceeds toward <strong>{{destination}}</strong>.</p>

<div style="margin:0 0 18px 0;padding:8px 0 0 0;background:#ffffff;">
  <p style="margin:0 0 10px 0;font-size:15px;line-height:24px;color:#111827;">
    <strong>Shipment Number:</strong>
    <span style="white-space:nowrap;word-break:keep-all;">{{shipmentId}}</span>
  </p>

  <p style="margin:0 0 10px 0;font-size:15px;line-height:24px;color:#111827;">
    <strong>Tracking Number:</strong>
    <span style="white-space:nowrap;word-break:keep-all;">{{trackingNumber}}</span>
  </p>

  <p style="margin:0;font-size:15px;line-height:24px;color:#111827;">
    <strong>Invoice Number:</strong>
    <span style="white-space:nowrap;word-break:keep-all;">{{invoiceNumber}}</span>
  </p>
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
    color: "green",
    icon: "check",
    defaultUpdate: "Shipment has been delivered successfully to the destination.",
    nextStep: "If there are delivery concerns, please contact support with your tracking number.",
    emailSubject: "Shipment delivered: {{shipmentId}}",
    emailTitle: "Shipment delivered",
    emailPreheader: "Your shipment has been delivered successfully.",
    emailBodyHtml: `
<p>Hello {{name}},</p>

<p>This is to confirm that your shipment <strong>{{shipmentId}}</strong> has been successfully <strong>delivered</strong>.</p>

<p>Delivery has been completed at <strong>{{destination}}</strong>.</p>

<div style="margin:0 0 18px 0;padding:8px 0 0 0;background:#ffffff;">
  <p style="margin:0 0 10px 0;font-size:15px;line-height:24px;color:#111827;">
    <strong>Shipment Number:</strong>
    <span style="white-space:nowrap;word-break:keep-all;">{{shipmentId}}</span>
  </p>

  <p style="margin:0 0 10px 0;font-size:15px;line-height:24px;color:#111827;">
    <strong>Tracking Number:</strong>
    <span style="white-space:nowrap;word-break:keep-all;">{{trackingNumber}}</span>
  </p>

  <p style="margin:0;font-size:15px;line-height:24px;color:#111827;">
    <strong>Invoice Number:</strong>
    <span style="white-space:nowrap;word-break:keep-all;">{{invoiceNumber}}</span>
  </p>
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
    color: "red",
    icon: "alert",
    defaultUpdate: "Shipment is available for pickup but has not yet been claimed.",
    nextStep: "Please arrange pickup or contact support for assistance.",
    emailSubject: "Shipment marked unclaimed: {{shipmentId}}",
    emailTitle: "Shipment marked unclaimed",
    emailPreheader: "Your shipment is currently marked as unclaimed.",
    emailBodyHtml: `
<p>Hello {{name}},</p>

<p>Your shipment <strong>{{shipmentId}}</strong> is currently marked as <strong>unclaimed</strong>.</p>

<p>Please contact our support team as soon as possible for assistance regarding the next required action.</p>

<div style="margin:0 0 18px 0;padding:8px 0 0 0;background:#ffffff;">
  <p style="margin:0 0 10px 0;font-size:15px;line-height:24px;color:#111827;">
    <strong>Shipment Number:</strong>
    <span style="white-space:nowrap;word-break:keep-all;">{{shipmentId}}</span>
  </p>

  <p style="margin:0 0 10px 0;font-size:15px;line-height:24px;color:#111827;">
    <strong>Tracking Number:</strong>
    <span style="white-space:nowrap;word-break:keep-all;">{{trackingNumber}}</span>
  </p>

  <p style="margin:0;font-size:15px;line-height:24px;color:#111827;">
    <strong>Invoice Number:</strong>
    <span style="white-space:nowrap;word-break:keep-all;">{{invoiceNumber}}</span>
  </p>
</div>

{{note}}
`.trim(),
    emailButtonText: "Contact support",
    emailButtonUrlType: "support",
  },
];

const allowedColors = [
  "blue",
  "green",
  "red",
  "orange",
  "yellow",
  "purple",
  "pink",
  "cyan",
  "indigo",
  "emerald",
  "rose",
  "slate",
  "gray",
  "amber",
];

const allowedIcons = [
  "package",
  "truck",
  "warehouse",
  "plane",
  "shield",
  "home",
  "clock",
  "check",
  "route",
  "file",
  "alert",
];

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const keyParam = url.searchParams.get("key");
    const key = keyParam ? normalizeKey(keyParam) : "";

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    const col = db.collection("statuses");

const dbStatuses = await col
  .find({})
  .project({ _id: 0 })
  .toArray();

const dbKeys = new Set(
  dbStatuses.map((s: any) => normalizeKey(String(s?.key || "")))
);

const now = new Date();

const missingDefaults = DEFAULT_STATUSES.filter(
  (s) => !dbKeys.has(normalizeKey(s.key))
);

if (missingDefaults.length) {
  await col.insertMany(
    missingDefaults.map((s) => ({
      ...s,
      createdAt: now,
      updatedAt: now,
    }))
  );
}

const freshStatuses = await col
  .find({})
  .project({ _id: 0 })
  .toArray();

const mergedMap: Record<string, any> = {};
for (const d of DEFAULT_STATUSES) mergedMap[normalizeKey(d.key)] = d;
for (const s of freshStatuses) {
  const k = normalizeKey(String((s as any).key || ""));
  if (k) mergedMap[k] = s;
}

    if (key) {
      const one = mergedMap[key] || null;
      return NextResponse.json({ status: one });
    }

    const mergedList = Object.values(mergedMap).sort((a: any, b: any) =>
      String(a?.label || "").localeCompare(String(b?.label || ""))
    );

    return NextResponse.json({ statuses: mergedList });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const label = String(body.label || "").trim();
    if (!label) {
      return NextResponse.json({ error: "Label is required." }, { status: 400 });
    }

    const key = normalizeKey(body.key || label);
    const color = allowedColors.includes(String(body.color || "").trim().toLowerCase())
      ? String(body.color).trim().toLowerCase()
      : "blue";

    const icon = allowedIcons.includes(String(body.icon || "").trim().toLowerCase())
      ? String(body.icon).trim().toLowerCase()
      : "package";

    const defaultUpdate = String(body.defaultUpdate || "").trim();
    const nextStep = String(body.nextStep || "").trim();

    const emailSubject = String(body.emailSubject || "").trim();
    const emailTitle = String(body.emailTitle || "").trim();
    const emailPreheader = String(body.emailPreheader || "").trim();
    const emailBodyHtml = String(body.emailBodyHtml || "").trim();
    const emailButtonText = String(body.emailButtonText || "").trim();
    const emailButtonUrlType = String(body.emailButtonUrlType || "track").trim();

    const badgeText = String(body.badgeText || "").trim();
    const badgeTone = String(body.badgeTone ?? "").trim();
    const showButton = typeof body.showButton === "boolean" ? body.showButton : true;
    const showLink = typeof body.showLink === "boolean" ? body.showLink : true;
    const linkText = String(body.linkText || "").trim();
    const linkUrlType = String(body.linkUrlType || "invoice").trim();
    const showDetailsCard = typeof body.showDetailsCard === "boolean" ? body.showDetailsCard : true;
    const detailsCardType = String(body.detailsCardType || "shipment").trim();

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    const now = new Date();

    const existing = await db.collection("statuses").findOne({ key });

    const doc = {
      key,
      label,
      color,
      icon,
      defaultUpdate,
      nextStep,
      emailSubject,
      emailTitle,
      emailPreheader,
      emailBodyHtml,
      emailButtonText,
      emailButtonUrlType,
      badgeText,
      badgeTone,
      showButton,
      showLink,
      linkText,
      linkUrlType,
      showDetailsCard,
      detailsCardType,
      updatedAt: now,
      ...(existing ? {} : { createdAt: now }),
    };

    await db.collection("statuses").updateOne(
      { key },
      { $set: doc },
      { upsert: true }
    );

    // Sync to email_templates as timeline:key
    const templateKey = `timeline:${key}`;
    const templateDoc = {
      key: templateKey,
      label: label,
      category: "timeline",
      subject: emailSubject || `Shipment update: {{shipmentId}}`,
      title: emailTitle || label,
      preheader: emailPreheader || "",
      bodyHtml: emailBodyHtml || `{{badge}}\n\n<p style="margin:0 0 16px 0;font-size:16px;line-height:26px;color:#111827;">\nHello {{name}},\n</p>\n\n<p style="margin:0 0 14px 0;font-size:16px;line-height:26px;color:#111827;">\n{{intro}}\n</p>\n\n<p style="margin:0 0 14px 0;font-size:16px;line-height:26px;color:#111827;">\n{{detail}}\n</p>\n\n<p style="margin:0 0 14px 0;font-size:16px;line-height:26px;color:#111827;">\n{{extra}}\n</p>\n\n{{detailsCard}}\n\n{{destinationBlock}}\n\n{{noteBlock}}\n\n<p style="margin:20px 0 0 0;font-size:15px;line-height:24px;color:#6b7280;">\n{{closingText}}\n</p>\n\n{{invoiceLink}}`,
      buttonText: emailButtonText || "Track Shipment",
      buttonUrlType: emailButtonUrlType || "track",
      badgeText,
      badgeTone,
      showButton,
      showLink,
      linkText: linkText || "View Invoice",
      linkUrlType: linkUrlType || "invoice",
      showDetailsCard,
      detailsCardType: detailsCardType || "shipment",
      updatedAt: now,
    };

    await db.collection("email_templates").updateOne(
      { key: templateKey },
      { $set: templateDoc, $setOnInsert: { createdAt: now } },
      { upsert: true }
    );

    return NextResponse.json({ ok: true, status: doc });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const keyParam = url.searchParams.get("key");
    const key = normalizeKey(keyParam || "");

    if (!key) {
      return NextResponse.json({ error: "Status key is required." }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    await db.collection("statuses").deleteOne({ key });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}