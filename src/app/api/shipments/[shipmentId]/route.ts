import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { auth } from "@/auth";
import { sendShipmentStatusEmail, sendInvoiceUpdateEmail } from "@/lib/email";

const normalizeStatus = (status?: string) =>
  (status ?? "").toLowerCase().trim().replace(/[\s_-]+/g, "");

function normalizeShipmentId(value: string) {
  return decodeURIComponent(value).trim();
}

function escapeRegex(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function shipmentIdQuery(id: string) {
  return { shipmentId: { $regex: `^${escapeRegex(id)}$`, $options: "i" } };
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ shipmentId: string }> }
) {
  try {
    const { shipmentId: raw } = await context.params;
    const shipmentId = normalizeShipmentId(raw);

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    console.log("🔥 DB NAME USED BY SHIPMENTS ROUTE:", db.databaseName);

const statusCount = await db.collection("statuses").countDocuments();
console.log("🔥 STATUSES COUNT IN THIS DB:", statusCount);

const sample = await db.collection("statuses").find({}).limit(5).project({ _id: 0, key: 1, label: 1 }).toArray();
console.log("🔥 STATUSES SAMPLE IN THIS DB:", sample);

    const shipment = await db.collection("shipments").findOne(
      shipmentIdQuery(shipmentId),
      { projection: { _id: 0 } }
    );

    if (!shipment) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ shipment });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ shipmentId: string }> }
) {
  try {
    console.log("🔥🔥 ACTIVE SHIPMENT PATCH ROUTE 999 🔥🔥");
    const session = await auth();
const role = String((session as any)?.user?.role || "").toUpperCase();
if (role !== "ADMIN") {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
    const { shipmentId: raw } = await context.params;
    const shipmentId = normalizeShipmentId(raw);

    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    console.log("🔥 DB NAME USED BY SHIPMENTS ROUTE:", db.databaseName);

const statusCount = await db.collection("statuses").countDocuments();
console.log("🔥 STATUSES COUNT IN THIS DB:", statusCount);

const sample = await db
  .collection("statuses")
  .find({})
  .limit(5)
  .project({ _id: 0, key: 1, label: 1 })
  .toArray();

console.log("🔥 STATUSES SAMPLE IN THIS DB:", sample);

    const existing = await db
      .collection("shipments")
      .findOne(shipmentIdQuery(shipmentId));

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const now = new Date();
    const $set: Record<string, any> = { updatedAt: now };

    // ----------------------------
   // --- STATUS UPDATE (key/label -> label + defaults) ---
if (typeof body.status === "string") {
  const rawStatus = String(body.status || "").trim();
  const normalizedKey = normalizeStatus(rawStatus);

  // ✅ Super-safe lookup: fetch all statuses and match by normalized key OR normalized label
  const allStatuses = await db
    .collection("statuses")
    .find({})
    .project({ _id: 0 })
    .toArray();

  const statusDoc =
    allStatuses.find((s: any) => normalizeStatus(String(s?.key || "")) === normalizedKey) ||
    allStatuses.find((s: any) => normalizeStatus(String(s?.label || "")) === normalizedKey) ||
    null;

  console.log("STATUS RAW:", rawStatus);
  console.log("STATUS NORMALIZED:", normalizedKey);
  console.log("STATUS DOC FOUND:", statusDoc);

  if (statusDoc) {
    // ✅ Always store LABEL in shipment.status
    $set.status = String(statusDoc.label || rawStatus).trim();
    $set.statusUpdatedAt = now;

    // Defaults from statuses doc (unless explicitly overridden)
    $set.statusColor =
      body.statusColor !== undefined
        ? String(body.statusColor || "").trim()
        : String(statusDoc.color || "").trim();

    $set.statusNote =
      body.statusNote !== undefined
        ? String(body.statusNote || "").trim()
        : String(statusDoc.defaultUpdate || "").trim();

    $set.nextStep =
      body.nextStep !== undefined
        ? String(body.nextStep || "").trim()
        : String(statusDoc.nextStep || "").trim();
  } else {
    // Not found → store what was provided (fallback)
    $set.status = rawStatus;
    $set.statusUpdatedAt = now;

    if (body.statusColor !== undefined) $set.statusColor = String(body.statusColor || "").trim();
    if (body.statusNote !== undefined) $set.statusNote = String(body.statusNote || "").trim();
    if (body.nextStep !== undefined) $set.nextStep = String(body.nextStep || "").trim();
  }
} else {
  // Status not being changed, but allow updating these fields directly
  if (body.statusColor !== undefined) $set.statusColor = String(body.statusColor || "").trim();
  if (body.statusNote !== undefined) $set.statusNote = String(body.statusNote || "").trim();
  if (body.nextStep !== undefined) $set.nextStep = String(body.nextStep || "").trim();
}

    // ----------------------------
    // 2) INVOICE UPDATE (optional)
    // ----------------------------
    if (body.invoice !== undefined && body.invoice !== null) {
      const prev = (existing as any).invoice || {};
      const incoming = body.invoice || {};
      const nextInvoice: any = { ...prev };

      if (incoming.amount !== undefined) {
        const n = Number(incoming.amount);
        nextInvoice.amount = Number.isFinite(n) ? n : 0;
      }

      if (incoming.currency !== undefined) {
        nextInvoice.currency = String(incoming.currency || "USD").toUpperCase();
      }

      if (incoming.paid !== undefined) {
        const paid = Boolean(incoming.paid);
        nextInvoice.paid = paid;
        nextInvoice.paidAt = paid ? (incoming.paidAt ? String(incoming.paidAt) : now.toISOString()) : null;
      } else if (incoming.paidAt !== undefined) {
        nextInvoice.paidAt = incoming.paidAt ? String(incoming.paidAt) : null;
      }

      $set.invoice = nextInvoice;
    }

    await db.collection("shipments").updateOne(
  shipmentIdQuery(shipmentId),
  { $set }
);

// Determine what actually changed
let title = "Shipment Updated";
let message = `Shipment ${shipmentId} was updated.`;

// If status changed
if (typeof body.status === "string") {
  const finalStatus =
    $set?.status ||
    body.status ||
    existing?.status ||
    "updated";

  title = "Shipment Status Updated";
  message = `Shipment ${shipmentId} status changed to ${finalStatus}.`;
}

// If invoice paid changed
if (body?.invoice?.paid !== undefined) {
  title = "Invoice Updated";
  message = `Invoice for shipment ${shipmentId} is now ${
    body.invoice.paid ? "PAID" : "UNPAID"
  }.`;
}

// Create notification
await db.collection("notifications").insertOne({
  userEmail: String(existing.createdByEmail || "").toLowerCase(),
  title,
  message,
  shipmentId,
  read: false,
  createdAt: new Date(),
});

const userEmail = String(existing.createdByEmail || "").toLowerCase().trim();

// (optional) get user's name for nicer emails
let userName = "Customer";
if (userEmail) {
  const uDoc = await db.collection("users").findOne(
    { email: userEmail },
    { projection: { name: 1 } }
  );
  if (uDoc?.name) userName = String((uDoc as any).name || "Customer");
}

// ✅ Send status email
if (typeof body.status === "string" && userEmail) {
  const finalStatus = String($set?.status || body.status || existing?.status || "Updated");
  await sendShipmentStatusEmail(userEmail, {
    name: userName,
    shipmentId,
    statusLabel: finalStatus,
  }).catch(() => null);
}

// ✅ Send invoice email
if (body?.invoice?.paid !== undefined && userEmail) {
  await sendInvoiceUpdateEmail(userEmail, {
    name: userName,
    shipmentId,
    paid: Boolean(body.invoice.paid),
  }).catch(() => null);
}

    const updated = await db.collection("shipments").findOne(
      shipmentIdQuery(shipmentId),
      { projection: { _id: 0 } }
    );

    return NextResponse.json({ ok: true, shipment: updated });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}