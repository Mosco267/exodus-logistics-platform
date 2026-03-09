import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { auth } from "@/auth";
import { computeInvoiceFromDeclaredValue, DEFAULT_PRICING, type PricingProfiles } from "@/lib/pricing";
import {
  sendShipmentStatusEmail,
  sendInvoiceUpdateEmail,
  sendInvoiceStatusReceiverEmail,
  sendShipmentDeletedEmail,
} from "@/lib/email";

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

function joinNice(parts: Array<any>) {
  return parts
    .map((x) => String(x ?? "").trim())
    .filter(Boolean)
    .join(", ");
}

// ✅ Fix TS errors on _id by typing the collection doc
type PricingSettings = PricingProfiles;
type PricingSettingsDoc = {
  _id: string; // "default"
  settings: PricingProfiles;
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

    const pricingProfiles: PricingProfiles = pricingDoc?.settings ?? DEFAULT_PRICING;

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
    // 1B) OTHER SHIPMENT FIELDS FROM EDIT PAGE
    // ----------------------------
    if (body?.senderName !== undefined) $set.senderName = String(body.senderName || "").trim() || null;
    if (body?.senderEmail !== undefined) $set.senderEmail = String(body.senderEmail || "").trim().toLowerCase() || null;
    if (body?.senderCountryCode !== undefined) $set.senderCountryCode = String(body.senderCountryCode || "").trim().toUpperCase() || null;
    if (body?.senderCountry !== undefined) $set.senderCountry = String(body.senderCountry || "").trim() || null;
    if (body?.senderState !== undefined) $set.senderState = String(body.senderState || "").trim() || null;
    if (body?.senderCity !== undefined) $set.senderCity = String(body.senderCity || "").trim() || null;
    if (body?.senderAddress !== undefined) $set.senderAddress = String(body.senderAddress || "").trim() || null;
    if (body?.senderPostalCode !== undefined) $set.senderPostalCode = String(body.senderPostalCode || "").trim() || null;
    if (body?.senderPhone !== undefined) $set.senderPhone = String(body.senderPhone || "").trim() || null;

    if (body?.receiverName !== undefined) $set.receiverName = String(body.receiverName || "").trim() || null;
    if (body?.receiverEmail !== undefined) $set.receiverEmail = String(body.receiverEmail || "").trim().toLowerCase() || null;
    if (body?.destinationCountryCode !== undefined) $set.destinationCountryCode = String(body.destinationCountryCode || "").trim().toUpperCase() || null;
    if (body?.receiverCountry !== undefined) $set.receiverCountry = String(body.receiverCountry || "").trim() || null;
    if (body?.receiverState !== undefined) $set.receiverState = String(body.receiverState || "").trim() || null;
    if (body?.receiverCity !== undefined) $set.receiverCity = String(body.receiverCity || "").trim() || null;
    if (body?.receiverAddress !== undefined) $set.receiverAddress = String(body.receiverAddress || "").trim() || null;
    if (body?.receiverPostalCode !== undefined) $set.receiverPostalCode = String(body.receiverPostalCode || "").trim() || null;
    if (body?.receiverPhone !== undefined) $set.receiverPhone = String(body.receiverPhone || "").trim() || null;
    
    if (body?.shipmentScope !== undefined) {
  $set.shipmentScope =
    String(body.shipmentScope || "").trim().toLowerCase() === "local"
      ? "local"
      : "international";
}
    if (body?.serviceLevel !== undefined) $set.serviceLevel = String(body.serviceLevel || "").trim() || null;
    if (body?.shipmentType !== undefined) $set.shipmentType = String(body.shipmentType || "").trim() || null;
    if (body?.shipmentMeans !== undefined) $set.shipmentMeans = String(body.shipmentMeans || "").trim() || null;
    if (body?.packageDescription !== undefined) $set.packageDescription = String(body.packageDescription || "").trim() || null;
    if (body?.estimatedDeliveryDate !== undefined) $set.estimatedDeliveryDate = body.estimatedDeliveryDate ? String(body.estimatedDeliveryDate) : null;
    if (body?.weightKg !== undefined) {
      const weight = Number(body.weightKg);
      $set.weightKg = Number.isFinite(weight) ? weight : null;
    }

    if (body?.dimensionsCm !== undefined) {
      $set.dimensionsCm = {
        length: Number(body?.dimensionsCm?.length || 0),
        width: Number(body?.dimensionsCm?.width || 0),
        height: Number(body?.dimensionsCm?.height || 0),
      };
    }

    if (body?.declaredValueCurrency !== undefined) {
      $set.declaredValueCurrency = String(body.declaredValueCurrency || "USD").trim().toUpperCase();
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
    const incomingInvoice = body?.invoice || null;

    const shouldRecalcInvoice =
      incomingInvoice !== null ||
      body?.declaredValue !== undefined ||
      body?.declaredValueCurrency !== undefined ||
      (existing as any)?.invoice === undefined;

    if (shouldRecalcInvoice) {
      const prev = (existing as any)?.invoice || {};

     const incomingPricingUsed = incomingInvoice?.pricingUsed || null;

  const shipmentScope =
  String(
    body?.shipmentScope ??
      $set?.shipmentScope ??
      (existing as any)?.shipmentScope ??
      "international"
  ).toLowerCase() === "local"
    ? "local"
    : "international";

const basePricing = pricingProfiles[shipmentScope] || DEFAULT_PRICING[shipmentScope];

const pricingToUse =
  incomingPricingUsed
    ? { ...basePricing, ...incomingPricingUsed }
    : prev?.pricingUsed
    ? { ...basePricing, ...prev.pricingUsed }
    : basePricing;

      const breakdown = computeInvoiceFromDeclaredValue(declaredValue, pricingToUse);

      const dueDate =
        incomingInvoice?.dueDate !== undefined
          ? incomingInvoice.dueDate
          : prev.dueDate || null;

      let nextStatus = String(
  incomingInvoice?.status !== undefined
    ? incomingInvoice.status
    : prev.status || ""
)
  .trim()
  .toLowerCase();

if (
  nextStatus !== "paid" &&
  nextStatus !== "unpaid" &&
  nextStatus !== "overdue" &&
  nextStatus !== "cancelled"
) {
  nextStatus = "";
}

// rules:
// paid stays paid
// cancelled stays cancelled
// overdue stays overdue if set manually
// unpaid should become overdue automatically when due date has passed
if (nextStatus === "paid") {
  nextStatus = "paid";
} else if (nextStatus === "cancelled") {
  nextStatus = "cancelled";
} else if (nextStatus === "overdue") {
  nextStatus = "overdue";
} else {
  if (dueDate) {
    const d = new Date(dueDate);
    if (!Number.isNaN(d.getTime()) && Date.now() > d.getTime()) {
      nextStatus = "overdue";
    } else {
      nextStatus = "unpaid";
    }
  } else {
    nextStatus = "unpaid";
  }
}

      const paid = nextStatus === "paid";

      const paymentMethod =
  incomingInvoice?.paymentMethod !== undefined
    ? (String(incomingInvoice.paymentMethod ?? "").trim() || null)
    : (prev?.paymentMethod ?? null);

      const currency =
        String(
          body?.declaredValueCurrency ||
          incomingInvoice?.currency ||
          prev.currency ||
          (existing as any)?.declaredValueCurrency ||
          "USD"
        )
          .trim()
          .toUpperCase();

      const nowIso = new Date().toISOString();

      $set.invoice = {
        ...prev,
        invoiceNumber: prev?.invoiceNumber || null,
        amount: breakdown.total,
        currency,
        paid,
        paidAt: paid ? (prev?.paidAt || nowIso) : null,
        status: nextStatus,
        dueDate,
        paymentMethod,
        breakdown: {
          ...breakdown,
        },
        pricingUsed: {
          ...pricingToUse,
        },
      };
    }

  // ----------------------------
// 0) TRACKING EVENT (timeline)
// ----------------------------
const $push: Record<string, any> = {};

let shouldSendTrackingStageEmail = false;
let trackingStageEmailLabel = "";
let trackingStageEmailNote = "";

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

const existingEvents = Array.isArray((existing as any)?.trackingEvents)
  ? (existing as any).trackingEvents
  : [];

const stageAlreadyExists = existingEvents.some((x: any) => {
  const existingKey = String(x?.key || "").trim().toLowerCase();
  const newKey = String(event.key || "").trim().toLowerCase();

  const existingLabel = String(x?.label || "").trim().toLowerCase();
  const newLabel = String(event.label || "").trim().toLowerCase();

  return existingKey === newKey || existingLabel === newLabel;
});

shouldSendTrackingStageEmail = !stageAlreadyExists;
trackingStageEmailLabel = event.label;
trackingStageEmailNote = event.note || "";

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

const updated = await db.collection("shipments").findOne(shipmentIdQuery(shipmentId), {
  projection: { _id: 0 },
});

if (!updated) {
  return NextResponse.json({ error: "Updated shipment not found" }, { status: 500 });
}

if (shouldSendTrackingStageEmail) {
  const senderEmail = String(
    (updated as any)?.senderEmail ||
    (existing as any)?.senderEmail ||
    (existing as any)?.createdByEmail ||
    ""
  ).trim().toLowerCase();

  const receiverEmail = String(
    (updated as any)?.receiverEmail || (existing as any)?.receiverEmail || ""
  ).trim().toLowerCase();

  const senderName = String(
    (updated as any)?.senderName || (existing as any)?.senderName || "Customer"
  ).trim();

  const receiverName = String(
    (updated as any)?.receiverName || (existing as any)?.receiverName || "Customer"
  ).trim();

  const trackingNumber = String(
    (updated as any)?.trackingNumber || (existing as any)?.trackingNumber || ""
  ).trim();

  const invoiceNumber = String(
    (updated as any)?.invoice?.invoiceNumber ||
    (existing as any)?.invoice?.invoiceNumber ||
    ""
  ).trim();

  const destination = joinNice([
    (updated as any)?.receiverCity,
    (updated as any)?.receiverState,
    (updated as any)?.receiverCountry,
  ]);

  const origin = joinNice([
    (updated as any)?.senderCity,
    (updated as any)?.senderState,
    (updated as any)?.senderCountry,
  ]);

  

  if (senderEmail) {
    await sendShipmentStatusEmail(senderEmail, {
      name: senderName,
      shipmentId,
      statusLabel: trackingStageEmailLabel,
      trackingNumber,
      invoiceNumber: invoiceNumber || undefined,
      destination,
      origin,
      note: trackingStageEmailNote,
      
    }).catch(() => null);
  }

  if (receiverEmail) {
    await sendShipmentStatusEmail(receiverEmail, {
      name: receiverName,
      shipmentId,
      statusLabel: trackingStageEmailLabel,
      trackingNumber,
      invoiceNumber: invoiceNumber || undefined,
      destination,
      origin,
      note: trackingStageEmailNote,
      
    }).catch(() => null);
  }
}

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

   if (body?.trackingEvent) {
  const trackingLabel = String($set?.status || body?.trackingEvent?.label || "Shipment Update").trim();
  title = trackingLabel;
  message = `Shipment ${shipmentId} was updated to ${trackingLabel}.`;
}

   if (body?.invoice !== undefined) {
  const prevInvoice = ((existing as any)?.invoice || {}) as any;
  const nextInvoice = (($set as any).invoice || prevInvoice) as any;

  const prevStatus = String(prevInvoice.status || "unpaid").toLowerCase();
  const nextStatus = String(nextInvoice.status || "unpaid").toLowerCase();

  if (prevStatus !== nextStatus) {
    title =
      nextStatus === "paid"
        ? "Invoice Paid"
        : nextStatus === "overdue"
        ? "Invoice Overdue"
        : nextStatus === "cancelled"
        ? "Invoice Cancelled"
        : "Invoice Updated";

    message =
      nextStatus === "paid"
        ? `Invoice for shipment ${shipmentId} is now PAID.`
        : nextStatus === "overdue"
        ? `Invoice for shipment ${shipmentId} is now OVERDUE.`
        : nextStatus === "cancelled"
        ? `Invoice for shipment ${shipmentId} has been CANCELLED.`
        : `Invoice for shipment ${shipmentId} is now UNPAID.`;

        const createdColor =
      nextStatus === "paid"
        ? "#22c55e"
        : nextStatus === "cancelled"
        ? "#ef4444"
        : "#f59e0b";

    await db.collection("shipments").updateOne(
      shipmentIdQuery(shipmentId),
      {
        $set: {
          "trackingEvents.$[created].color": createdColor,
        },
      },
      {
        arrayFilters: [{ "created.key": "created" }],
      }
    );

    if ((updated as any)?.trackingEvents && Array.isArray((updated as any).trackingEvents)) {
      (updated as any).trackingEvents = (updated as any).trackingEvents.map((ev: any) =>
        String(ev?.key || "").toLowerCase() === "created"
          ? { ...ev, color: createdColor }
          : ev
      );
    }

    const senderEmail = String(
      (updated as any)?.senderEmail ||
      (existing as any)?.senderEmail ||
      (existing as any)?.createdByEmail ||
      ""
    ).trim().toLowerCase();

    const receiverEmail = String(
      (updated as any)?.receiverEmail || (existing as any)?.receiverEmail || ""
    ).trim().toLowerCase();

    const senderName = String(
      (updated as any)?.senderName || (existing as any)?.senderName || "Customer"
    ).trim();

    const receiverName = String(
      (updated as any)?.receiverName || (existing as any)?.receiverName || "Customer"
    ).trim();

    const trackingNumber = String(
      (updated as any)?.trackingNumber || (existing as any)?.trackingNumber || ""
    ).trim();

    if (senderEmail) {
      await sendInvoiceUpdateEmail(senderEmail, {
        name: senderName,
        shipmentId,
        status: nextStatus,
        trackingNumber,
        invoiceNumber: nextInvoice.invoiceNumber || undefined,
      }).catch(() => null);
    }

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
        status: nextStatus,
        invoiceNumber: nextInvoice.invoiceNumber || undefined,
        viewInvoiceUrl: `${base}/en/invoice/full?q=${encodeURIComponent(trackingNumber)}`,
      }).catch(() => null);
    }
  }
}




   await db.collection("notifications").insertOne({
 userEmail: String(
  (updated as any)?.senderEmail ||
  (updated as any)?.receiverEmail ||
  (updated as any)?.createdByEmail ||
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

  if (body?.invoice !== undefined && userEmail) {
  const prevInvoice = ((existing as any)?.invoice || {}) as any;
  const nextInvoice = (($set.invoice || (existing as any)?.invoice || {}) as any);

  if (String(prevInvoice.status || "unpaid").toLowerCase() !== String(nextInvoice.status || "unpaid").toLowerCase()) {
    await sendInvoiceUpdateEmail(userEmail, {
      name: userName,
      shipmentId,
      status: String(nextInvoice.status || "unpaid").toLowerCase(),
      invoiceNumber: nextInvoice.invoiceNumber || undefined,
      trackingNumber:
        String((updated as any)?.trackingNumber || (existing as any)?.trackingNumber || "").trim() || undefined,
    }).catch(() => null);
  }
}

    

    return NextResponse.json({ ok: true, shipment: updated });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
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

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    const existing = await db.collection("shipments").findOne(shipmentIdQuery(shipmentId));
    if (!existing) {
      return NextResponse.json({ error: "Shipment not found" }, { status: 404 });
    }

    await db.collection("shipments").deleteOne(shipmentIdQuery(shipmentId));

    const senderEmail = String(
  (existing as any)?.senderEmail || (existing as any)?.createdByEmail || ""
).trim().toLowerCase();

const receiverEmail = String((existing as any)?.receiverEmail || "")
  .trim()
  .toLowerCase();

const senderName = String((existing as any)?.senderName || "Customer").trim();
const receiverName = String((existing as any)?.receiverName || "Customer").trim();
const trackingNumber = String((existing as any)?.trackingNumber || "").trim();

if (senderEmail) {
  await sendShipmentDeletedEmail(senderEmail, {
    name: senderName,
    shipmentId,
    trackingNumber,
  }).catch(() => null);
}

if (receiverEmail) {
  await sendShipmentDeletedEmail(receiverEmail, {
    name: receiverName,
    shipmentId,
    trackingNumber,
  }).catch(() => null);
}

    return NextResponse.json({ ok: true, deleted: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
} 