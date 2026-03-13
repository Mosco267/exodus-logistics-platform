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
    emailButtonText: "View Shipment",
    emailButtonUrlType: "track",
  },
  {
    key: "pickup",
    label: "Picked Up",
    color: "amber",
    icon: "package",
    defaultUpdate: "Shipment has been picked up and entered into our logistics network.",
    nextStep: "The package will be moved to the next processing facility shortly.",
    emailSubject: "Shipment picked up: {{shipmentId}}",
    emailTitle: "Shipment picked up",
    emailPreheader: "Your shipment has been picked up.",
    emailBodyHtml: `
<p>Hello {{name}},</p>

<p>We are pleased to inform you that your shipment <strong>{{shipmentId}}</strong> has been successfully picked up and entered into our logistics network.</p>

<p>The shipment is now being processed for movement from <strong>{{origin}}</strong> toward <strong>{{destination}}</strong>.</p>

<p><strong>Shipment Number:</strong> <span style="white-space:nowrap;">{{shipmentId}}</span><br/>
<strong>Tracking Number:</strong> <span style="white-space:nowrap;">{{trackingNumber}}</span><br/>
<strong>Invoice Number:</strong> <span style="white-space:nowrap;">{{invoiceNumber}}</span></p>

<p>{{note}}</p>

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
    color: "green",
    icon: "warehouse",
    defaultUpdate: "Shipment has been received at our warehouse facility.",
    nextStep: "Internal handling and dispatch preparation are in progress.",
    emailSubject: "Shipment received at warehouse: {{shipmentId}}",
    emailTitle: "Shipment received at warehouse",
    emailPreheader: "Your shipment is now at our warehouse.",
    emailBodyHtml: `
<p>Hello {{name}},</p>

<p>Your shipment <strong>{{shipmentId}}</strong> has been received at our warehouse facility.</p>

<p>It is currently undergoing internal handling and preparation before moving to the next shipping stage toward <strong>{{destination}}</strong>.</p>

<p><strong>Shipment Number:</strong> <span style="white-space:nowrap;">{{shipmentId}}</span><br/>
<strong>Tracking Number:</strong> <span style="white-space:nowrap;">{{trackingNumber}}</span><br/>
<strong>Invoice Number:</strong> <span style="white-space:nowrap;">{{invoiceNumber}}</span></p>

<p>{{note}}</p>

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

<p><strong>Shipment Number:</strong> <span style="white-space:nowrap;">{{shipmentId}}</span><br/>
<strong>Tracking Number:</strong> <span style="white-space:nowrap;">{{trackingNumber}}</span><br/>
<strong>Invoice Number:</strong> <span style="white-space:nowrap;">{{invoiceNumber}}</span></p>

<p>{{note}}</p>

<div style="margin-top:12px;">
  <a href="{{invoiceUrl}}" style="color:#2563eb;text-decoration:underline;font-weight:600;">View Invoice</a>
</div>
`.trim(),
    emailButtonText: "Track Shipment",
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
    emailPreheader: "Your shipment is currently under customs clearance.",
    emailBodyHtml: `
<p>Hello {{name}},</p>

<p>Your shipment <strong>{{shipmentId}}</strong> is currently undergoing <strong>customs clearance</strong>.</p>

<p>This is a routine compliance stage before the shipment proceeds toward <strong>{{destination}}</strong>.</p>

<p><strong>Shipment Number:</strong> <span style="white-space:nowrap;">{{shipmentId}}</span><br/>
<strong>Tracking Number:</strong> <span style="white-space:nowrap;">{{trackingNumber}}</span><br/>
<strong>Invoice Number:</strong> <span style="white-space:nowrap;">{{invoiceNumber}}</span></p>

<p>{{note}}</p>

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
    color: "indigo",
    icon: "home",
    defaultUpdate: "Shipment is out for delivery and on the final route to the receiver.",
    nextStep: "Please remain available to receive or pick up the shipment.",
    emailSubject: "Out for delivery: {{shipmentId}}",
    emailTitle: "Shipment out for delivery",
    emailPreheader: "Your shipment is now out for delivery.",
    emailBodyHtml: `
<p>Hello {{name}},</p>

<p>Your shipment <strong>{{shipmentId}}</strong> is now <strong>out for delivery</strong>.</p>

<p>Our delivery team is currently on the final route to the receiver's address below. Please be available and ready to receive or pick up the shipment.</p>

<p><strong>Delivery address:</strong><br/>{{destination}}</p>

<p><strong>Shipment Number:</strong> <span style="white-space:nowrap;">{{shipmentId}}</span><br/>
<strong>Tracking Number:</strong> <span style="white-space:nowrap;">{{trackingNumber}}</span><br/>
<strong>Invoice Number:</strong> <span style="white-space:nowrap;">{{invoiceNumber}}</span></p>

<p>{{note}}</p>

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
    emailTitle: "Shipment delivered successfully",
    emailPreheader: "Your shipment has been delivered.",
    emailBodyHtml: `
<p>Hello {{name}},</p>

<p>This is to confirm that your shipment <strong>{{shipmentId}}</strong> has been successfully <strong>delivered</strong>.</p>

<p>Delivery has been completed at <strong>{{destination}}</strong>.</p>

<p><strong>Shipment Number:</strong> <span style="white-space:nowrap;">{{shipmentId}}</span><br/>
<strong>Tracking Number:</strong> <span style="white-space:nowrap;">{{trackingNumber}}</span><br/>
<strong>Invoice Number:</strong> <span style="white-space:nowrap;">{{invoiceNumber}}</span></p>

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
    emailPreheader: "Your shipment currently requires attention.",
    emailBodyHtml: `
<p>Hello {{name}},</p>

<p>Your shipment <strong>{{shipmentId}}</strong> is currently marked as <strong>unclaimed</strong>.</p>

<p>Please contact our support team as soon as possible for assistance regarding the next required action.</p>

<p><strong>Shipment Number:</strong> <span style="white-space:nowrap;">{{shipmentId}}</span><br/>
<strong>Tracking Number:</strong> <span style="white-space:nowrap;">{{trackingNumber}}</span><br/>
<strong>Invoice Number:</strong> <span style="white-space:nowrap;">{{invoiceNumber}}</span></p>
`.trim(),
    emailButtonText: "Contact support",
    emailButtonUrlType: "support",
  },
  {
    key: "cancelled",
    label: "Cancelled",
    color: "red",
    icon: "alert",
    defaultUpdate: "Shipment has been cancelled.",
    nextStep: "Please contact support if you need clarification.",
    emailSubject: "Shipment cancelled: {{shipmentId}}",
    emailTitle: "Shipment cancelled",
    emailPreheader: "Your shipment has been cancelled.",
    emailBodyHtml: `
<p>Hello {{name}},</p>

<p>Your shipment <strong>{{shipmentId}}</strong> has been marked as <strong>cancelled</strong>.</p>

<p>If you believe this update was made in error or require clarification, please contact our support team.</p>

<p><strong>Shipment Number:</strong> <span style="white-space:nowrap;">{{shipmentId}}</span><br/>
<strong>Tracking Number:</strong> <span style="white-space:nowrap;">{{trackingNumber}}</span><br/>
<strong>Invoice Number:</strong> <span style="white-space:nowrap;">{{invoiceNumber}}</span></p>
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

    const dbStatuses = await db
      .collection("statuses")
      .find({})
      .project({ _id: 0 })
      .toArray();

    const mergedMap: Record<string, any> = {};
    for (const d of DEFAULT_STATUSES) mergedMap[normalizeKey(d.key)] = d;
    for (const s of dbStatuses) {
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
      updatedAt: now,
      ...(existing ? {} : { createdAt: now }),
    };

    await db.collection("statuses").updateOne(
      { key },
      { $set: doc },
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