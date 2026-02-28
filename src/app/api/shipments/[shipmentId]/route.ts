import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { auth } from "@/auth";
import { computeInvoiceFromDeclaredValue, DEFAULT_PRICING } from "@/lib/pricing";
import { sendShipmentStatusEmail, sendInvoiceUpdateEmail, sendInvoiceStatusReceiverEmail } from "@/lib/email";

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

// ✅ Fix TS errors on _id by typing the collection doc
type PricingSettings = typeof DEFAULT_PRICING;
type PricingSettingsDoc = {
  _id: string; // "default"
  settings: PricingSettings;
  updatedAt?: Date;
};

export async function GET(
  _req: Request,
  context: { params: Promise<{ shipmentId: string }> }
) {
  try {
    const { shipmentId: raw } = await context.params;
    const shipmentId = normalizeShipmentId(raw);

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    const shipment = await db.collection("shipments").findOne(shipmentIdQuery(shipmentId), {
      projection: { _id: 0 },
    });

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

    // ✅ ADMIN ONLY
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

    const existing = await db.collection("shipments").findOne(shipmentIdQuery(shipmentId));
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // ✅ Pricing settings (typed so _id doesn't error)
    const pricingDoc = await db
      .collection<PricingSettingsDoc>("pricing_settings")
      .findOne({ _id: "default" });

    const pricing: PricingSettings = pricingDoc?.settings ?? DEFAULT_PRICING;

    const now = new Date();
    const $set: Record<string, any> = { updatedAt: now };

    // ----------------------------
    // 1) STATUS UPDATE (key/label -> label + defaults)
    // ----------------------------
    if (typeof body.status === "string") {
      const rawStatus = String(body.status || "").trim();
      const normalizedKey = normalizeStatus(rawStatus);

      const allStatuses = await db
        .collection("statuses")
        .find({})
        .project({ _id: 0 })
        .toArray();

      const statusDoc =
        allStatuses.find((s: any) => normalizeStatus(String(s?.key || "")) === normalizedKey) ||
        allStatuses.find((s: any) => normalizeStatus(String(s?.label || "")) === normalizedKey) ||
        null;

      if (statusDoc) {
        $set.status = String(statusDoc.label || rawStatus).trim();
        $set.statusUpdatedAt = now;

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
        $set.status = rawStatus;
        $set.statusUpdatedAt = now;

        if (body.statusColor !== undefined) $set.statusColor = String(body.statusColor || "").trim();
        if (body.statusNote !== undefined) $set.statusNote = String(body.statusNote || "").trim();
        if (body.nextStep !== undefined) $set.nextStep = String(body.nextStep || "").trim();
      }
    } else {
      if (body.statusColor !== undefined) $set.statusColor = String(body.statusColor || "").trim();
      if (body.statusNote !== undefined) $set.statusNote = String(body.statusNote || "").trim();
      if (body.nextStep !== undefined) $set.nextStep = String(body.nextStep || "").trim();
    }

    // ----------------------------
    // 2) DECLARED VALUE (supports declaredValue or packageValue)
    // ----------------------------
    const incomingDeclared =
      body?.declaredValue !== undefined
        ? Number(body.declaredValue)
        : (existing as any)?.declaredValue !== undefined
          ? Number((existing as any).declaredValue)
          : Number((existing as any)?.packageValue || 0);

    const declaredValue = Number.isFinite(incomingDeclared) ? incomingDeclared : 0;

    if (body?.declaredValue !== undefined) {
      $set.declaredValue = declaredValue;
    }

   // ----------------------------
// 3) INVOICE UPDATE
// ----------------------------

// A) If ONLY toggling paid/unpaid → DO NOT recalc breakdown
const isOnlyPaidToggle =
  body?.invoice &&
  Object.keys(body).length === 1 &&
  Object.keys(body.invoice).length === 1 &&
  body.invoice.paid !== undefined;

if (isOnlyPaidToggle) {
  const prev = (existing as any).invoice || {};
  const paid = Boolean(body.invoice.paid);
  const nowIso = new Date().toISOString();

  $set.invoice = {
    ...prev,
    paid,
    paidAt: paid ? nowIso : null,
  };
} else {
  // B) Otherwise we may need to recalc (declared value changed, invoice missing, etc.)
  const shouldRecalcInvoice =
    body?.invoice !== undefined ||
    body?.declaredValue !== undefined ||
    (existing as any)?.invoice === undefined;

  if (shouldRecalcInvoice) {
    // ✅ Use stored rates from this shipment first (if available)
    const storedRates =
      (existing as any)?.invoice?.breakdown?.rates ||
      (existing as any)?.invoice?.breakdown?.pricing ||
      null;

    const pricingToUse = storedRates
      ? { ...DEFAULT_PRICING, ...storedRates }
      : pricing; // fallback to pricing_settings

    const breakdown = computeInvoiceFromDeclaredValue(declaredValue, pricingToUse);

    const prev = (existing as any).invoice || {};
    const incoming = body.invoice || {};

    const paid =
      incoming.paid !== undefined ? Boolean(incoming.paid) : Boolean(prev.paid);

    const nowIso = new Date().toISOString();

    $set.invoice = {
      ...prev,
      amount: breakdown.total,
      currency: String(prev.currency || incoming.currency || "USD").toUpperCase(),
      paid,
      paidAt: paid ? (incoming.paidAt ? String(incoming.paidAt) : nowIso) : null,
      breakdown: {
        ...breakdown,
        rates: storedRates || (breakdown as any)?.rates || null,
      },
    };
  }
}

  // ----------------------------
// 0) TRACKING EVENT (timeline)
// ----------------------------
const $push: Record<string, any> = {};

if (body?.trackingEvent) {
  const ev = body.trackingEvent;

  const event = {
  key: String(ev?.key || ev?.label || "update")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "-"),
  label: String(ev?.label || "Update").trim(),

  // ✅ this is one “detail entry” for that stage
  note: String(ev?.note || "").trim(),

  occurredAt: ev?.occurredAt ? new Date(ev.occurredAt).toISOString() : now.toISOString(),

  // ✅ NEW: allow admin to set color per entry
  color: String(ev?.color || "").trim(), // e.g. "#22c55e" or "green"

  location: {
    country: String(ev?.location?.country || "").trim(),
    state: String(ev?.location?.state || "").trim(),
    city: String(ev?.location?.city || "").trim(),
    county: String(ev?.location?.county || "").trim(),
  },
};

  // push to shipment timeline
  $push.trackingEvents = event;

  // keep the main status fields in sync for lists/filters
  $set.status = event.label;
  $set.statusNote = event.note || $set.statusNote || "";
  $set.statusUpdatedAt = new Date(event.occurredAt);

  // optional: clear nextStep if you want
  // $set.nextStep = "";
}

    // ----------------------------
// 4) SAVE
// ----------------------------
const update: any = { $set };
if (Object.keys($push).length) update.$push = $push;

await db.collection("shipments").updateOne(shipmentIdQuery(shipmentId), update);

    // ----------------------------
    // 5) NOTIFICATION + EMAIL
    // ----------------------------
    let title = "Shipment Updated";
    let message = `Shipment ${shipmentId} was updated.`;

    if (typeof body.status === "string") {
      const finalStatus =
        $set?.status || body.status || (existing as any)?.status || "updated";
      title = "Shipment Status Updated";
      message = `Shipment ${shipmentId} status changed to ${finalStatus}.`;
    }

    if (body?.invoice?.paid !== undefined) {
  const paid = Boolean(body.invoice.paid);

  title = "Invoice Updated";
  message = `Invoice for shipment ${shipmentId} is now ${paid ? "PAID" : "UNPAID"}.`;

  // ✅ Send emails to BOTH sender + receiver
  const senderEmail = String(
    (existing as any)?.senderEmail || (existing as any)?.createdByEmail || ""
  )
    .trim()
    .toLowerCase();

  const receiverEmail = String((existing as any)?.receiverEmail || "")
    .trim()
    .toLowerCase();

  const senderName = String((existing as any)?.senderName || "Customer").trim();
  const receiverName = String((existing as any)?.receiverName || "Customer").trim();
  const trackingNumber = String((existing as any)?.trackingNumber || "").trim();

  // sender
  if (senderEmail) {
    await sendInvoiceUpdateEmail(senderEmail, { name: senderName, shipmentId, paid }).catch(() => null);
  }

  // receiver
  if (receiverEmail) {
    const base =
      (process.env.APP_URL ||
        process.env.NEXT_PUBLIC_APP_URL ||
        "https://www.goexoduslogistics.com").replace(/\/$/, "");

    await sendInvoiceStatusReceiverEmail(receiverEmail, {
      name: receiverName,
      senderName: senderName || "Sender",
      shipmentId,
      trackingNumber,
      paid,
      viewInvoiceUrl: `${base}/en/invoice/full?q=${encodeURIComponent(shipmentId)}`,
    }).catch(() => null);
  }
}

    await db.collection("notifications").insertOne({
     userEmail: String(
  (existing as any)?.senderEmail ||
  (existing as any)?.receiverEmail ||
  (existing as any)?.createdByEmail ||
  ""
).trim().toLowerCase(),
      title,
      message,
      shipmentId,
      read: false,
      createdAt: new Date(),
    });

    const userEmail = String((existing as any).createdByEmail || "").toLowerCase().trim();

    let userName = "Customer";
    if (userEmail) {
      const uDoc = await db.collection("users").findOne(
        { email: userEmail },
        { projection: { name: 1 } }
      );
      if ((uDoc as any)?.name) userName = String((uDoc as any).name || "Customer");
    }

    if (typeof body.status === "string" && userEmail) {
      const finalStatus = String(
        $set?.status || body.status || (existing as any)?.status || "Updated"
      );

      await sendShipmentStatusEmail(userEmail, {
        name: userName,
        shipmentId,
        statusLabel: finalStatus,
      }).catch(() => null);
    }

    if (body?.invoice?.paid !== undefined && userEmail) {
      await sendInvoiceUpdateEmail(userEmail, {
        name: userName,
        shipmentId,
        paid: Boolean(body.invoice.paid),
      }).catch(() => null);
    }

    const updated = await db.collection("shipments").findOne(shipmentIdQuery(shipmentId), {
      projection: { _id: 0 },
    });

    return NextResponse.json({ ok: true, shipment: updated });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}