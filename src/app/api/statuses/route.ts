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
    emailSubject: "Shipment created ({{shipmentId}})",
    emailTitle: "Shipment created",
    emailPreheader: "Your shipment has been created.",
    emailBodyHtml:
      "<p>Hello {{name}},</p><p>Your shipment <strong>{{shipmentId}}</strong> has been created successfully.</p>",
    emailButtonText: "View Shipment",
    emailButtonUrlType: "track",
  },
  {
    key: "intransit",
    label: "In Transit",
    color: "blue",
    icon: "truck",
    defaultUpdate: "Shipment is in transit and moving toward the destination.",
    nextStep: "Continue tracking for real-time movement updates.",
    emailSubject: "Shipment in transit ({{shipmentId}})",
    emailTitle: "Shipment in transit",
    emailPreheader: "Your shipment is now in transit.",
    emailBodyHtml:
      "<p>Hello {{name}},</p><p>Your shipment <strong>{{shipmentId}}</strong> is now in transit.</p>",
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
    emailSubject: "Customs clearance update ({{shipmentId}})",
    emailTitle: "Shipment under customs clearance",
    emailPreheader: "Your shipment is under customs clearance.",
    emailBodyHtml:
      "<p>Hello {{name}},</p><p>Your shipment <strong>{{shipmentId}}</strong> is currently undergoing customs clearance.</p>",
    emailButtonText: "Track Shipment",
    emailButtonUrlType: "track",
  },
  {
    key: "delivered",
    label: "Delivered",
    color: "green",
    icon: "home",
    defaultUpdate: "Shipment has been delivered successfully to the destination.",
    nextStep: "If there are delivery concerns, please contact support with your tracking number.",
    emailSubject: "Shipment delivered ({{shipmentId}})",
    emailTitle: "Shipment delivered",
    emailPreheader: "Your shipment has been delivered successfully.",
    emailBodyHtml:
      "<p>Hello {{name}},</p><p>Your shipment <strong>{{shipmentId}}</strong> has been delivered successfully.</p>",
    emailButtonText: "View Shipment",
    emailButtonUrlType: "track",
  },
  {
    key: "unclaimed",
    label: "Unclaimed",
    color: "red",
    icon: "clock",
    defaultUpdate: "Shipment is available for pickup but has not yet been claimed.",
    nextStep: "Please arrange pickup or contact support for assistance.",
    emailSubject: "Shipment marked unclaimed ({{shipmentId}})",
    emailTitle: "Shipment marked unclaimed",
    emailPreheader: "Your shipment requires attention.",
    emailBodyHtml:
      "<p>Hello {{name}},</p><p>Your shipment <strong>{{shipmentId}}</strong> is currently marked as unclaimed.</p>",
    emailButtonText: "Contact Support",
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
      if (k) mergedMap[k] = { ...mergedMap[k], ...s };
    }

    if (key) {
      return NextResponse.json({ status: mergedMap[key] || null });
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

    const doc = {
      key,
      label,
      color,
      icon,
      defaultUpdate: String(body.defaultUpdate || "").trim(),
      nextStep: String(body.nextStep || "").trim(),
      emailSubject: String(body.emailSubject || "").trim(),
      emailTitle: String(body.emailTitle || "").trim(),
      emailPreheader: String(body.emailPreheader || "").trim(),
      emailBodyHtml: String(body.emailBodyHtml || "").trim(),
      emailButtonText: String(body.emailButtonText || "").trim(),
      emailButtonUrlType: String(body.emailButtonUrlType || "track").trim(),
      updatedAt: new Date(),
    };

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    await db.collection("statuses").updateOne(
      { key },
      { $set: doc, $setOnInsert: { createdAt: new Date() } },
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
    const key = normalizeKey(url.searchParams.get("key") || "");

    if (!key) {
      return NextResponse.json({ error: "Missing status key." }, { status: 400 });
    }

    const builtInKeys = DEFAULT_STATUSES.map((s) => normalizeKey(s.key));
    if (builtInKeys.includes(key)) {
      return NextResponse.json(
        { error: "Built-in timeline stages cannot be deleted." },
        { status: 400 }
      );
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