import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { auth } from "@/auth";
import { computeInvoiceFromDeclaredValue, DEFAULT_PRICING, type PricingProfiles } from "@/lib/pricing";
import {
  sendShipmentStatusEmail,
  sendInvoiceUpdateEmail,
  sendShipmentDeletedEmail,
  sendShipmentEditedEmail
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

function sameValue(a: any, b: any) {
  return String(a ?? "").trim() === String(b ?? "").trim();
}

function dimsText(v: any) {
  if (!v) return "";
  const l = Number(v?.length || 0);
  const w = Number(v?.width || 0);
  const h = Number(v?.height || 0);
  if (!l && !w && !h) return "";
  return `${l || 0} × ${w || 0} × ${h || 0} cm`;
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
    const editedChanges: Array<{ label: string; oldValue?: any; newValue?: any }> = [];

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
    if (body?.senderName !== undefined) {
  const next = String(body.senderName || "").trim() || null;
  $set.senderName = next;
  if (!sameValue((existing as any)?.senderName, next)) {
    editedChanges.push({
      label: "Sender name",
      oldValue: (existing as any)?.senderName,
      newValue: next,
    });
  }
}

if (body?.senderEmail !== undefined) {
  const next = String(body.senderEmail || "").trim().toLowerCase() || null;
  $set.senderEmail = next;
  if (!sameValue((existing as any)?.senderEmail, next)) {
    editedChanges.push({
      label: "Sender email",
      oldValue: (existing as any)?.senderEmail,
      newValue: next,
    });
  }
}

if (body?.senderCountryCode !== undefined) {
  const next = String(body.senderCountryCode || "").trim().toUpperCase() || null;
  $set.senderCountryCode = next;
  if (!sameValue((existing as any)?.senderCountryCode, next)) {
    editedChanges.push({
      label: "Sender country code",
      oldValue: (existing as any)?.senderCountryCode,
      newValue: next,
    });
  }
}

if (body?.senderCountry !== undefined) {
  const next = String(body.senderCountry || "").trim() || null;
  $set.senderCountry = next;
  if (!sameValue((existing as any)?.senderCountry, next)) {
    editedChanges.push({
      label: "Sender country",
      oldValue: (existing as any)?.senderCountry,
      newValue: next,
    });
  }
}

if (body?.senderState !== undefined) {
  const next = String(body.senderState || "").trim() || null;
  $set.senderState = next;
  if (!sameValue((existing as any)?.senderState, next)) {
    editedChanges.push({
      label: "Sender state",
      oldValue: (existing as any)?.senderState,
      newValue: next,
    });
  }
}

if (body?.senderCity !== undefined) {
  const next = String(body.senderCity || "").trim() || null;
  $set.senderCity = next;
  if (!sameValue((existing as any)?.senderCity, next)) {
    editedChanges.push({
      label: "Sender city",
      oldValue: (existing as any)?.senderCity,
      newValue: next,
    });
  }
}

if (body?.senderAddress !== undefined) {
  const next = String(body.senderAddress || "").trim() || null;
  $set.senderAddress = next;
  if (!sameValue((existing as any)?.senderAddress, next)) {
    editedChanges.push({
      label: "Sender address",
      oldValue: (existing as any)?.senderAddress,
      newValue: next,
    });
  }
}

if (body?.senderPostalCode !== undefined) {
  const next = String(body.senderPostalCode || "").trim() || null;
  $set.senderPostalCode = next;
  if (!sameValue((existing as any)?.senderPostalCode, next)) {
    editedChanges.push({
      label: "Sender postal code",
      oldValue: (existing as any)?.senderPostalCode,
      newValue: next,
    });
  }
}

if (body?.senderPhone !== undefined) {
  const next = String(body.senderPhone || "").trim() || null;
  $set.senderPhone = next;
  if (!sameValue((existing as any)?.senderPhone, next)) {
    editedChanges.push({
      label: "Sender phone",
      oldValue: (existing as any)?.senderPhone,
      newValue: next,
    });
  }
}

if (body?.receiverName !== undefined) {
  const next = String(body.receiverName || "").trim() || null;
  $set.receiverName = next;
  if (!sameValue((existing as any)?.receiverName, next)) {
    editedChanges.push({
      label: "Receiver name",
      oldValue: (existing as any)?.receiverName,
      newValue: next,
    });
  }
}

if (body?.receiverEmail !== undefined) {
  const next = String(body.receiverEmail || "").trim().toLowerCase() || null;
  $set.receiverEmail = next;
  if (!sameValue((existing as any)?.receiverEmail, next)) {
    editedChanges.push({
      label: "Receiver email",
      oldValue: (existing as any)?.receiverEmail,
      newValue: next,
    });
  }
}

if (body?.destinationCountryCode !== undefined) {
  const next = String(body.destinationCountryCode || "").trim().toUpperCase() || null;
  $set.destinationCountryCode = next;
  if (!sameValue((existing as any)?.destinationCountryCode, next)) {
    editedChanges.push({
      label: "Destination country code",
      oldValue: (existing as any)?.destinationCountryCode,
      newValue: next,
    });
  }
}

if (body?.receiverCountry !== undefined) {
  const next = String(body.receiverCountry || "").trim() || null;
  $set.receiverCountry = next;
  if (!sameValue((existing as any)?.receiverCountry, next)) {
    editedChanges.push({
      label: "Receiver country",
      oldValue: (existing as any)?.receiverCountry,
      newValue: next,
    });
  }
}

if (body?.receiverState !== undefined) {
  const next = String(body.receiverState || "").trim() || null;
  $set.receiverState = next;
  if (!sameValue((existing as any)?.receiverState, next)) {
    editedChanges.push({
      label: "Receiver state",
      oldValue: (existing as any)?.receiverState,
      newValue: next,
    });
  }
}

if (body?.receiverCity !== undefined) {
  const next = String(body.receiverCity || "").trim() || null;
  $set.receiverCity = next;
  if (!sameValue((existing as any)?.receiverCity, next)) {
    editedChanges.push({
      label: "Receiver city",
      oldValue: (existing as any)?.receiverCity,
      newValue: next,
    });
  }
}

if (body?.receiverAddress !== undefined) {
  const next = String(body.receiverAddress || "").trim() || null;
  $set.receiverAddress = next;
  if (!sameValue((existing as any)?.receiverAddress, next)) {
    editedChanges.push({
      label: "Receiver address",
      oldValue: (existing as any)?.receiverAddress,
      newValue: next,
    });
  }
}

if (body?.receiverPostalCode !== undefined) {
  const next = String(body.receiverPostalCode || "").trim() || null;
  $set.receiverPostalCode = next;
  if (!sameValue((existing as any)?.receiverPostalCode, next)) {
    editedChanges.push({
      label: "Receiver postal code",
      oldValue: (existing as any)?.receiverPostalCode,
      newValue: next,
    });
  }
}

if (body?.receiverPhone !== undefined) {
  const next = String(body.receiverPhone || "").trim() || null;
  $set.receiverPhone = next;
  if (!sameValue((existing as any)?.receiverPhone, next)) {
    editedChanges.push({
      label: "Receiver phone",
      oldValue: (existing as any)?.receiverPhone,
      newValue: next,
    });
  }
}

if (body?.shipmentScope !== undefined) {
  const next =
    String(body.shipmentScope || "").trim().toLowerCase() === "local"
      ? "local"
      : "international";

  $set.shipmentScope = next;
  if (!sameValue((existing as any)?.shipmentScope, next)) {
    editedChanges.push({
      label: "Shipping type",
      oldValue: (existing as any)?.shipmentScope,
      newValue: next,
    });
  }
}

if (body?.serviceLevel !== undefined) {
  const next = String(body.serviceLevel || "").trim() || null;
  $set.serviceLevel = next;
  if (!sameValue((existing as any)?.serviceLevel, next)) {
    editedChanges.push({
      label: "Service level",
      oldValue: (existing as any)?.serviceLevel,
      newValue: next,
    });
  }
}

if (body?.shipmentType !== undefined) {
  const next = String(body.shipmentType || "").trim() || null;
  $set.shipmentType = next;
  if (!sameValue((existing as any)?.shipmentType, next)) {
    editedChanges.push({
      label: "Shipment type",
      oldValue: (existing as any)?.shipmentType,
      newValue: next,
    });
  }
}

if (body?.shipmentMeans !== undefined) {
  const next = String(body.shipmentMeans || "").trim() || null;
  $set.shipmentMeans = next;
  if (!sameValue((existing as any)?.shipmentMeans, next)) {
    editedChanges.push({
      label: "Shipment means",
      oldValue: (existing as any)?.shipmentMeans,
      newValue: next,
    });
  }
}

if (body?.packageDescription !== undefined) {
  const next = String(body.packageDescription || "").trim() || null;
  $set.packageDescription = next;
  if (!sameValue((existing as any)?.packageDescription, next)) {
    editedChanges.push({
      label: "Package description",
      oldValue: (existing as any)?.packageDescription,
      newValue: next,
    });
  }
}

if (body?.estimatedDeliveryDate !== undefined) {
  const next = body.estimatedDeliveryDate ? String(body.estimatedDeliveryDate) : null;
  $set.estimatedDeliveryDate = next;
  if (!sameValue((existing as any)?.estimatedDeliveryDate, next)) {
    editedChanges.push({
      label: "Estimated delivery date",
      oldValue: (existing as any)?.estimatedDeliveryDate,
      newValue: next,
    });
  }
}

if (body?.weightKg !== undefined) {
  const weight = Number(body.weightKg);
  const next = Number.isFinite(weight) ? weight : null;
  $set.weightKg = next;

  if (Number((existing as any)?.weightKg ?? 0) !== Number(next ?? 0)) {
    editedChanges.push({
      label: "Weight",
      oldValue:
        (existing as any)?.weightKg !== undefined && (existing as any)?.weightKg !== null
          ? `${(existing as any)?.weightKg} kg`
          : null,
      newValue: next !== null ? `${next} kg` : null,
    });
  }
}

if (body?.dimensionsCm !== undefined) {
  const nextDims = {
    length: Number(body?.dimensionsCm?.length || 0),
    width: Number(body?.dimensionsCm?.width || 0),
    height: Number(body?.dimensionsCm?.height || 0),
  };

  $set.dimensionsCm = nextDims;

  if (dimsText((existing as any)?.dimensionsCm) !== dimsText(nextDims)) {
    editedChanges.push({
      label: "Dimensions",
      oldValue: dimsText((existing as any)?.dimensionsCm),
      newValue: dimsText(nextDims),
    });
  }
}

if (body?.declaredValueCurrency !== undefined) {
  const next = String(body.declaredValueCurrency || "USD").trim().toUpperCase();
  $set.declaredValueCurrency = next;
  if (!sameValue((existing as any)?.declaredValueCurrency, next)) {
    editedChanges.push({
      label: "Currency",
      oldValue: (existing as any)?.declaredValueCurrency,
      newValue: next,
    });
  }
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

const prevInvoice = ((existing as any)?.invoice || {}) as any;
const nextInvoice = ((updated as any)?.invoice || prevInvoice) as any;

const prevInvoiceStatus = String(prevInvoice.status || "unpaid").toLowerCase();
const nextInvoiceStatus = String(nextInvoice.status || "unpaid").toLowerCase();

const invoiceStatusActuallyChanged = prevInvoiceStatus !== nextInvoiceStatus;

const onlyInvoiceStatusChanged =
  invoiceStatusActuallyChanged &&
  editedChanges.length === 0 &&
  !body?.trackingEvent &&
  body?.status === undefined;

if (!onlyInvoiceStatusChanged && editedChanges.length > 0) {
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

  const intro =
    "Please be informed that certain shipment details have been updated in our system. Kindly review the latest shipment and invoice information using the tracking or invoice page for the most current details.";

  if (senderEmail) {
    await sendShipmentEditedEmail(senderEmail, {
      name: senderName,
      shipmentId,
      trackingNumber,
      invoiceNumber: invoiceNumber || undefined,
      intro,
      changes: editedChanges,
    }).catch(() => null);
  }

  if (receiverEmail) {
    await sendShipmentEditedEmail(receiverEmail, {
      name: receiverName,
      shipmentId,
      trackingNumber,
      invoiceNumber: invoiceNumber || undefined,
      intro,
      changes: editedChanges,
    }).catch(() => null);
  }
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

const fullDestination = joinNice([
  (updated as any)?.receiverAddress,
  (updated as any)?.receiverCity,
  (updated as any)?.receiverState,
  (updated as any)?.receiverPostalCode,
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
  fullDestination,
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
  fullDestination,
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
  await sendInvoiceUpdateEmail(receiverEmail, {
    name: receiverName,
    shipmentId,
    status: nextStatus,
    trackingNumber,
    invoiceNumber: nextInvoice.invoiceNumber || undefined,
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