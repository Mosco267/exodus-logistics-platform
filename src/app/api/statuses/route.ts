import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

const normalizeKey = (v: string) =>
  (v ?? "").toLowerCase().trim().replace(/[\s_-]+/g, "");

// ✅ Built-in defaults (always available)
const DEFAULT_STATUSES = [
  {
    key: "created",
    label: "Created",
    color: "slate",
    defaultUpdate: "Shipment has been created and is being processed.",
    nextStep: "Dispatch will be scheduled once processing is complete.",
  },
  {
    key: "intransit",
    label: "In Transit",
    color: "blue",
    defaultUpdate: "Shipment is in transit and moving toward the destination.",
    nextStep: "Continue tracking for real-time movement updates.",
  },
  {
    key: "customclearance",
    label: "Custom Clearance",
    color: "orange",
    defaultUpdate: "Shipment is undergoing customs clearance. Additional verification may be required.",
    nextStep: "We will update you once customs clearance is completed.",
  },
  {
    key: "delivered",
    label: "Delivered",
    color: "green",
    defaultUpdate: "Shipment has been delivered successfully to the destination.",
    nextStep: "If there are delivery concerns, please contact support with your tracking number.",
  },
  {
    key: "unclaimed",
    label: "Unclaimed",
    color: "red",
    defaultUpdate: "Shipment is available for pickup but has not yet been claimed.",
    nextStep: "Please arrange pickup or contact support for assistance.",
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

    // Merge defaults + DB (DB overrides defaults if same key)
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
    const color = allowedColors.includes(body.color) ? body.color : "blue";

    const defaultUpdate = String(body.defaultUpdate || "").trim();
    const nextStep = String(body.nextStep || "").trim();

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    const now = new Date();

    const existing = await db.collection("statuses").findOne({ key });

    const doc = {
      key,
      label,
      color,
      defaultUpdate,
      nextStep,
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