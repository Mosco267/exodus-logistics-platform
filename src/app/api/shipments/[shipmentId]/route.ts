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
  return parts.map((x) => String(x ?? "").trim()).filter(Boolean).join(", ");
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

// Fix 1 — colors that must NEVER be overridden
const PERMANENT_COLORS = new Set(["#ef4444", "#dc2626", "#b91c1c"]);

function isRedColor(c: string) {
  const v = String(c || "").trim().toLowerCase();
  return v === "#ef4444" || v === "#dc2626" || v === "#b91c1c" || v === "red";
}

function isGreenColor(c: string) {
  const v = String(c || "").trim().toLowerCase();
  return v === "#22c55e" || v === "#16a34a" || v === "green";
}

type PricingSettings = PricingProfiles;
type PricingSettingsDoc = {
  _id: string;
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

    if (!shipment) return NextResponse.json({ error: "Not found" }, { status: 404 });

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
    if (role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { shipmentId: raw } = await context.params;
    const shipmentId = normalizeShipmentId(raw);

    let body: any;
    try { body = await req.json(); }
    catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }); }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    const existing = await db.collection("shipments").findOne(shipmentIdQuery(shipmentId));
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // ── Fix 3: Handle special tracking event operations ──────────────────────
    // DELETE a specific tracking event by index
    if (body?.deleteTrackingEventIndex !== undefined) {
      const idx = Number(body.deleteTrackingEventIndex);
      const events = Array.isArray((existing as any)?.trackingEvents) ? [...(existing as any).trackingEvents] : [];
      if (idx >= 0 && idx < events.length) {
        events.splice(idx, 1);
        await db.collection("shipments").updateOne(
          shipmentIdQuery(shipmentId),
          { $set: { trackingEvents: events, updatedAt: new Date() } }
        );
        const updated = await db.collection("shipments").findOne(shipmentIdQuery(shipmentId), { projection: { _id: 0 } });
        return NextResponse.json({ ok: true, shipment: updated });
      }
      return NextResponse.json({ error: "Invalid event index" }, { status: 400 });
    }

    // EDIT a specific tracking event by index
    if (body?.editTrackingEventIndex !== undefined && body?.editTrackingEventData !== undefined) {
      const idx = Number(body.editTrackingEventIndex);
      const events = Array.isArray((existing as any)?.trackingEvents) ? [...(existing as any).trackingEvents] : [];
      if (idx >= 0 && idx < events.length) {
        const ev = body.editTrackingEventData;
        events[idx] = {
          ...events[idx],
          label: ev.label !== undefined ? String(ev.label).trim() : events[idx].label,
          details: ev.details !== undefined ? String(ev.details).trim() : events[idx].details,
          note: ev.note !== undefined ? String(ev.note).trim() : events[idx].note,
          additionalNote: ev.additionalNote !== undefined ? String(ev.additionalNote).trim() : events[idx].additionalNote,
          color: ev.color !== undefined ? String(ev.color).trim() : events[idx].color,
          detailColor: ev.detailColor !== undefined ? String(ev.detailColor).trim() : events[idx].detailColor,
          currentLocation: ev.currentLocation !== undefined ? String(ev.currentLocation).trim() : events[idx].currentLocation,
          location: ev.location !== undefined ? {
            country: String(ev.location?.country || "").trim(),
            state: String(ev.location?.state || "").trim(),
            city: String(ev.location?.city || "").trim(),
            county: String(ev.location?.county || "").trim(),
          } : events[idx].location,
        };
        await db.collection("shipments").updateOne(
          shipmentIdQuery(shipmentId),
          { $set: { trackingEvents: events, updatedAt: new Date() } }
        );
        const updated = await db.collection("shipments").findOne(shipmentIdQuery(shipmentId), { projection: { _id: 0 } });
        return NextResponse.json({ ok: true, shipment: updated });
      }
      return NextResponse.json({ error: "Invalid event index" }, { status: 400 });
    }

    // ADD a sub-entry to an existing tracking event by index
    if (body?.addSubEntryToEventIndex !== undefined && body?.subEntry !== undefined) {
  const idx = Number(body.addSubEntryToEventIndex);
  const events = Array.isArray((existing as any)?.trackingEvents)
    ? [...(existing as any).trackingEvents]
    : [];
  if (idx >= 0 && idx < events.length) {
    const parentEvent = events[idx];
    const sub = body.subEntry;
    // Save as a new trackingEvent with the SAME key as parent
    // so the track API groups it under the same stage
    const newEntry = {
      key: String(parentEvent.key || "").trim(),
      label: String(parentEvent.label || "").trim(),
      details: String(sub.details || "").trim(),
      note: String(sub.note || "").trim(),
      additionalNote: String(sub.additionalNote || "").trim(),
      color: String(sub.color || parentEvent.color || "#f59e0b").trim(),
      detailColor: String(sub.detailColor || sub.color || "#f59e0b").trim(),
      currentLocation: String(sub.currentLocation || "").trim(),
      occurredAt: sub.occurredAt
        ? new Date(sub.occurredAt).toISOString()
        : new Date().toISOString(),
      location: {
        country: String(sub.location?.country || parentEvent.location?.country || "").trim(),
        state: String(sub.location?.state || parentEvent.location?.state || "").trim(),
        city: String(sub.location?.city || parentEvent.location?.city || "").trim(),
        county: "",
      },
    };
    await db.collection("shipments").updateOne(
  shipmentIdQuery(shipmentId),
  { $push: { trackingEvents: newEntry } } as any
);
await db.collection("shipments").updateOne(
  shipmentIdQuery(shipmentId),
  { $set: { updatedAt: new Date() } }
);
    const updated = await db.collection("shipments").findOne(
      shipmentIdQuery(shipmentId),
      { projection: { _id: 0 } }
    );
    return NextResponse.json({ ok: true, shipment: updated });
  }
  return NextResponse.json({ error: "Invalid event index" }, { status: 400 });
}

    const pricingDoc = await db.collection<PricingSettingsDoc>("pricing_settings").findOne({ _id: "default" });
    const pricingProfiles: PricingProfiles = pricingDoc?.settings ?? DEFAULT_PRICING;

    const now = new Date();
    const $set: Record<string, any> = { updatedAt: now };
    const editedChanges: Array<{ label: string; oldValue?: any; newValue?: any }> = [];

    // STATUS UPDATE
    if (typeof body.status === "string") {
      const rawStatus = String(body.status || "").trim();
      const normalizedKey = normalizeStatus(rawStatus);
      const allStatuses = await db.collection("statuses").find({}).project({ _id: 0 }).toArray();
      const statusDoc =
        allStatuses.find((s: any) => normalizeStatus(String(s?.key || "")) === normalizedKey) ||
        allStatuses.find((s: any) => normalizeStatus(String(s?.label || "")) === normalizedKey) || null;

      if (statusDoc) {
        $set.status = String(statusDoc.label || rawStatus).trim();
        $set.statusUpdatedAt = now;
        $set.statusColor = body.statusColor !== undefined ? String(body.statusColor || "").trim() : String(statusDoc.color || "").trim();
        $set.statusNote = body.statusNote !== undefined ? String(body.statusNote || "").trim() : String(statusDoc.defaultUpdate || "").trim();
        $set.nextStep = body.nextStep !== undefined ? String(body.nextStep || "").trim() : String(statusDoc.nextStep || "").trim();
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

    // OTHER SHIPMENT FIELDS
    const stringFields: Array<[string, string]> = [
      ["senderName", "Sender name"], ["senderEmail", "Sender email"],
      ["senderCountry", "Sender country"], ["senderState", "Sender state"],
      ["senderCity", "Sender city"], ["senderAddress", "Sender address"],
      ["senderPostalCode", "Sender postal code"], ["senderPhone", "Sender phone"],
      ["receiverName", "Receiver name"], ["receiverEmail", "Receiver email"],
      ["receiverCountry", "Receiver country"], ["receiverState", "Receiver state"],
      ["receiverCity", "Receiver city"], ["receiverAddress", "Receiver address"],
      ["receiverPostalCode", "Receiver postal code"], ["receiverPhone", "Receiver phone"],
      ["serviceLevel", "Service level"], ["shipmentType", "Shipment type"],
      ["shipmentMeans", "Shipment means"], ["packageDescription", "Package description"],
    ];

    for (const [field, label] of stringFields) {
      if (body?.[field] !== undefined) {
        const isEmail = field.includes("Email");
        const next = String(body[field] || "").trim()[isEmail ? "toLowerCase" : "toString"]() || null;
        $set[field] = next;
        if (!sameValue((existing as any)?.[field], next)) editedChanges.push({ label, oldValue: (existing as any)?.[field], newValue: next });
      }
    }

    if (body?.senderCountryCode !== undefined) {
      const next = String(body.senderCountryCode || "").trim().toUpperCase() || null;
      $set.senderCountryCode = next;
      if (!sameValue((existing as any)?.senderCountryCode, next)) editedChanges.push({ label: "Sender country code", oldValue: (existing as any)?.senderCountryCode, newValue: next });
    }
    if (body?.destinationCountryCode !== undefined) {
      const next = String(body.destinationCountryCode || "").trim().toUpperCase() || null;
      $set.destinationCountryCode = next;
      if (!sameValue((existing as any)?.destinationCountryCode, next)) editedChanges.push({ label: "Destination country code", oldValue: (existing as any)?.destinationCountryCode, newValue: next });
    }
    if (body?.shipmentScope !== undefined) {
      const next = String(body.shipmentScope || "").trim().toLowerCase() === "local" ? "local" : "international";
      $set.shipmentScope = next;
      if (!sameValue((existing as any)?.shipmentScope, next)) editedChanges.push({ label: "Shipping type", oldValue: (existing as any)?.shipmentScope, newValue: next });
    }
    if (body?.estimatedDeliveryDate !== undefined) {
      const next = body.estimatedDeliveryDate ? String(body.estimatedDeliveryDate) : null;
      $set.estimatedDeliveryDate = next;
      if (!sameValue((existing as any)?.estimatedDeliveryDate, next)) editedChanges.push({ label: "Estimated delivery date", oldValue: (existing as any)?.estimatedDeliveryDate, newValue: next });
    }
    if (body?.weightKg !== undefined) {
      const weight = Number(body.weightKg);
      const next = Number.isFinite(weight) ? weight : null;
      $set.weightKg = next;
      if (Number((existing as any)?.weightKg ?? 0) !== Number(next ?? 0)) editedChanges.push({ label: "Weight", oldValue: (existing as any)?.weightKg != null ? `${(existing as any)?.weightKg} kg` : null, newValue: next !== null ? `${next} kg` : null });
    }
    if (body?.dimensionsCm !== undefined) {
      const nextDims = { length: Number(body?.dimensionsCm?.length || 0), width: Number(body?.dimensionsCm?.width || 0), height: Number(body?.dimensionsCm?.height || 0) };
      $set.dimensionsCm = nextDims;
      if (dimsText((existing as any)?.dimensionsCm) !== dimsText(nextDims)) editedChanges.push({ label: "Dimensions", oldValue: dimsText((existing as any)?.dimensionsCm), newValue: dimsText(nextDims) });
    }
    if (body?.declaredValueCurrency !== undefined) {
      const next = String(body.declaredValueCurrency || "USD").trim().toUpperCase();
      $set.declaredValueCurrency = next;
      if (!sameValue((existing as any)?.declaredValueCurrency, next)) editedChanges.push({ label: "Currency", oldValue: (existing as any)?.declaredValueCurrency, newValue: next });
    }

    // DECLARED VALUE
    const incomingDeclared = body?.declaredValue !== undefined ? Number(body.declaredValue) : (existing as any)?.declaredValue !== undefined ? Number((existing as any).declaredValue) : Number((existing as any)?.packageValue || 0);
    const declaredValue = Number.isFinite(incomingDeclared) ? incomingDeclared : 0;
    if (body?.declaredValue !== undefined) $set.declaredValue = declaredValue;

    // INVOICE UPDATE
    const incomingInvoice = body?.invoice || null;
    const shouldRecalcInvoice = incomingInvoice !== null || body?.declaredValue !== undefined || body?.declaredValueCurrency !== undefined || (existing as any)?.invoice === undefined;

    if (shouldRecalcInvoice) {
      const prev = (existing as any)?.invoice || {};
      const incomingPricingUsed = incomingInvoice?.pricingUsed || null;
      const shipmentScope = String(body?.shipmentScope ?? $set?.shipmentScope ?? (existing as any)?.shipmentScope ?? "international").toLowerCase() === "local" ? "local" : "international";
      const basePricing = pricingProfiles[shipmentScope] || DEFAULT_PRICING[shipmentScope];
      const pricingToUse = incomingPricingUsed ? { ...basePricing, ...incomingPricingUsed } : prev?.pricingUsed ? { ...basePricing, ...prev.pricingUsed } : basePricing;
      const breakdown = computeInvoiceFromDeclaredValue(declaredValue, pricingToUse);
      const dueDate = incomingInvoice?.dueDate !== undefined ? incomingInvoice.dueDate : prev.dueDate || null;

      let nextStatus = String(incomingInvoice?.status !== undefined ? incomingInvoice.status : prev.status || "").trim().toLowerCase();
      if (!["paid", "unpaid", "overdue", "cancelled"].includes(nextStatus)) nextStatus = "";

      if (nextStatus === "paid" || nextStatus === "cancelled" || nextStatus === "overdue") {
        // keep as-is
      } else {
        if (dueDate) {
          const d = new Date(dueDate);
          nextStatus = (!Number.isNaN(d.getTime()) && Date.now() > d.getTime()) ? "overdue" : "unpaid";
        } else {
          nextStatus = "unpaid";
        }
      }

      const paid = nextStatus === "paid";
      const paymentMethod = incomingInvoice?.paymentMethod !== undefined ? (String(incomingInvoice.paymentMethod ?? "").trim() || null) : (prev?.paymentMethod ?? null);
      const currency = String(body?.declaredValueCurrency || incomingInvoice?.currency || prev.currency || (existing as any)?.declaredValueCurrency || "USD").trim().toUpperCase();

      $set.invoice = {
        ...prev,
        invoiceNumber: prev?.invoiceNumber || null,
        amount: breakdown.total,
        currency,
        paid,
        paidAt: paid ? (prev?.paidAt || new Date().toISOString()) : null,
        status: nextStatus,
        dueDate,
        paymentMethod,
        breakdown: { ...breakdown },
        pricingUsed: { ...pricingToUse },
      };
    }

    // TRACKING EVENT
    const $push: Record<string, any> = {};
    let shouldSendTrackingStageEmail = false;
    let trackingStageEmailLabel = "";
    let trackingStageEmailNote = "";
    let trackingStageEmailAdditionalNote = "";

    if (body?.trackingEvent) {
      const ev = body.trackingEvent;

      const event: any = {
        key: String(ev?.key || ev?.label || "update").trim().toLowerCase().replace(/[\s_-]+/g, "-"),
        label: String(ev?.label || "Update").trim(),

        // Fix 2 — store details, note, additionalNote separately
        details: String(ev?.details || "").trim(),
        note: String(ev?.note || "").trim(),
        additionalNote: String(ev?.additionalNote || "").trim(),

        occurredAt: ev?.occurredAt ? new Date(ev.occurredAt).toISOString() : now.toISOString(),
        color: String(ev?.color || "").trim(),
        detailColor: String(ev?.detailColor || "").trim(),
        currentLocation: String(ev?.currentLocation || "").trim(),
        location: {
          country: String(ev?.location?.country || "").trim(),
          state: String(ev?.location?.state || "").trim(),
          city: String(ev?.location?.city || "").trim(),
          county: String(ev?.location?.county || "").trim(),
        },
      };

      const existingEvents = Array.isArray((existing as any)?.trackingEvents) ? (existing as any).trackingEvents : [];
      const stageAlreadyExists = existingEvents.some((x: any) => {
        const existingKey = String(x?.key || "").trim().toLowerCase();
        const newKey = String(event.key || "").trim().toLowerCase();
        const existingLabel = String(x?.label || "").trim().toLowerCase();
        const newLabel = String(event.label || "").trim().toLowerCase();
        return existingKey === newKey || existingLabel === newLabel;
      });

      shouldSendTrackingStageEmail = !stageAlreadyExists;
      trackingStageEmailLabel = event.label;
      trackingStageEmailNote = event.details || event.note || "";
      trackingStageEmailAdditionalNote = event.additionalNote || "";  

      $push.trackingEvents = event;
      $set.status = event.label;
      $set.statusNote = event.note || event.details || $set.statusNote || "";
      $set.statusUpdatedAt = new Date(event.occurredAt);
    }

    // SAVE
    const update: any = { $set };
    if (Object.keys($push).length) update.$push = $push;
    await db.collection("shipments").updateOne(shipmentIdQuery(shipmentId), update);

    const updated = await db.collection("shipments").findOne(shipmentIdQuery(shipmentId), { projection: { _id: 0 } });
    if (!updated) return NextResponse.json({ error: "Updated shipment not found" }, { status: 500 });

    const prevInvoice = ((existing as any)?.invoice || {}) as any;
    const nextInvoice = ((updated as any)?.invoice || prevInvoice) as any;
    const prevInvoiceStatus = String(prevInvoice.status || "unpaid").toLowerCase();
    const nextInvoiceStatus = String(nextInvoice.status || "unpaid").toLowerCase();
    const invoiceStatusActuallyChanged = prevInvoiceStatus !== nextInvoiceStatus;
    const onlyInvoiceStatusChanged = invoiceStatusActuallyChanged && editedChanges.length === 0 && !body?.trackingEvent && body?.status === undefined;

    if (!onlyInvoiceStatusChanged && editedChanges.length > 0) {
      const senderEmail = String((updated as any)?.senderEmail || (existing as any)?.senderEmail || (existing as any)?.createdByEmail || "").trim().toLowerCase();
      const receiverEmail = String((updated as any)?.receiverEmail || (existing as any)?.receiverEmail || "").trim().toLowerCase();
      const senderName = String((updated as any)?.senderName || (existing as any)?.senderName || "Customer").trim();
      const receiverName = String((updated as any)?.receiverName || (existing as any)?.receiverName || "Customer").trim();
      const trackingNumber = String((updated as any)?.trackingNumber || (existing as any)?.trackingNumber || "").trim();
      const invoiceNumber = String((updated as any)?.invoice?.invoiceNumber || (existing as any)?.invoice?.invoiceNumber || "").trim();
      const intro = "Please be informed that certain shipment details have been updated in our system.";

      if (senderEmail) await sendShipmentEditedEmail(senderEmail, { name: senderName, shipmentId, trackingNumber, invoiceNumber: invoiceNumber || undefined, intro, changes: editedChanges }).catch(() => null);
      if (receiverEmail) await sendShipmentEditedEmail(receiverEmail, { name: receiverName, shipmentId, trackingNumber, invoiceNumber: invoiceNumber || undefined, intro, changes: editedChanges }).catch(() => null);
    }

    if (shouldSendTrackingStageEmail) {
      const senderEmail = String((updated as any)?.senderEmail || (existing as any)?.senderEmail || (existing as any)?.createdByEmail || "").trim().toLowerCase();
      const receiverEmail = String((updated as any)?.receiverEmail || (existing as any)?.receiverEmail || "").trim().toLowerCase();
      const senderName = String((updated as any)?.senderName || (existing as any)?.senderName || "Customer").trim();
      const receiverName = String((updated as any)?.receiverName || (existing as any)?.receiverName || "Customer").trim();
      const trackingNumber = String((updated as any)?.trackingNumber || (existing as any)?.trackingNumber || "").trim();
      const invoiceNumber = String((updated as any)?.invoice?.invoiceNumber || (existing as any)?.invoice?.invoiceNumber || "").trim();
      const destination = joinNice([(updated as any)?.receiverCity, (updated as any)?.receiverState, (updated as any)?.receiverCountry]);
      const fullDestination = joinNice([(updated as any)?.receiverAddress, (updated as any)?.receiverCity, (updated as any)?.receiverState, (updated as any)?.receiverPostalCode, (updated as any)?.receiverCountry]);
      const origin = joinNice([(updated as any)?.senderCity, (updated as any)?.senderState, (updated as any)?.senderCountry]);

      if (senderEmail) await sendShipmentStatusEmail(senderEmail, { name: senderName, shipmentId, statusLabel: trackingStageEmailLabel, trackingNumber, invoiceNumber: invoiceNumber || undefined, destination, fullDestination, origin, note: trackingStageEmailNote, additionalNote: trackingStageEmailAdditionalNote, }).catch(() => null);
      if (receiverEmail) await sendShipmentStatusEmail(receiverEmail, { name: receiverName, shipmentId, statusLabel: trackingStageEmailLabel, trackingNumber, invoiceNumber: invoiceNumber || undefined, destination, fullDestination, origin, note: trackingStageEmailNote, additionalNote: trackingStageEmailAdditionalNote, }).catch(() => null);
    }

    // NOTIFICATION + EMAIL for invoice changes
    let title = "Shipment Updated";
    let message = `Shipment ${shipmentId} was updated.`;

    if (typeof body.status === "string") {
      const finalStatus = $set?.status || body.status || (existing as any)?.status || "updated";
      title = "Shipment Status Updated";
      message = `Shipment ${shipmentId} status changed to ${finalStatus}.`;
    }

    if (body?.trackingEvent) {
      const trackingLabel = String($set?.status || body?.trackingEvent?.label || "Shipment Update").trim();
      title = trackingLabel;
      message = `Shipment ${shipmentId} was updated to ${trackingLabel}.`;
    }

    if (body?.invoice !== undefined) {
      const prevStatus = String(prevInvoice.status || "unpaid").toLowerCase();
      const nextStatus = String(nextInvoice.status || "unpaid").toLowerCase();

      if (prevStatus !== nextStatus) {
        title = nextStatus === "paid" ? "Invoice Paid" : nextStatus === "overdue" ? "Invoice Overdue" : nextStatus === "cancelled" ? "Invoice Cancelled" : "Invoice Updated";
        message = nextStatus === "paid" ? `Invoice for shipment ${shipmentId} is now PAID.` : nextStatus === "overdue" ? `Invoice for shipment ${shipmentId} is now OVERDUE.` : nextStatus === "cancelled" ? `Invoice for shipment ${shipmentId} has been CANCELLED.` : `Invoice for shipment ${shipmentId} is now UNPAID.`;

        // Fix 1 — only update "created" event color if it is NOT already red
        const createdColor = nextStatus === "paid" ? "#22c55e" : nextStatus === "cancelled" ? "#ef4444" : "#f59e0b";

        const currentEvents = Array.isArray((existing as any)?.trackingEvents) ? (existing as any).trackingEvents : [];
        const createdEvent = currentEvents.find((ev: any) => String(ev?.key || "").toLowerCase() === "created");

        // Only update if the created event's color is NOT red (permanent)
        if (createdEvent && !isRedColor(String(createdEvent?.color || ""))) {
          await db.collection("shipments").updateOne(
            shipmentIdQuery(shipmentId),
            { $set: { "trackingEvents.$[created].color": createdColor } },
            { arrayFilters: [{ "created.key": "created" }] }
          );

          if ((updated as any)?.trackingEvents && Array.isArray((updated as any).trackingEvents)) {
            (updated as any).trackingEvents = (updated as any).trackingEvents.map((ev: any) =>
              String(ev?.key || "").toLowerCase() === "created" ? { ...ev, color: createdColor } : ev
            );
          }
        }

        // Fix 1 — for ALL non-created events, only update color if they are NOT red
        // and only if new status is green (paid) or amber (unpaid/overdue)
        // Never touch red events
        

        const senderEmail = String((updated as any)?.senderEmail || (existing as any)?.senderEmail || (existing as any)?.createdByEmail || "").trim().toLowerCase();
        const receiverEmail = String((updated as any)?.receiverEmail || (existing as any)?.receiverEmail || "").trim().toLowerCase();
        const senderName = String((updated as any)?.senderName || (existing as any)?.senderName || "Customer").trim();
        const receiverName = String((updated as any)?.receiverName || (existing as any)?.receiverName || "Customer").trim();
        const trackingNumber = String((updated as any)?.trackingNumber || (existing as any)?.trackingNumber || "").trim();

        if (senderEmail) await sendInvoiceUpdateEmail(senderEmail, { name: senderName, otherPartyName: receiverName, recipientRole: "sender", shipmentId, status: nextStatus, trackingNumber, invoiceNumber: nextInvoice.invoiceNumber || undefined }).catch(() => null);
        if (receiverEmail) await sendInvoiceUpdateEmail(receiverEmail, { name: receiverName, otherPartyName: senderName, recipientRole: "receiver", shipmentId, status: nextStatus, trackingNumber, invoiceNumber: nextInvoice.invoiceNumber || undefined }).catch(() => null);
      }
    }

    await db.collection("notifications").insertOne({
      userEmail: String((updated as any)?.senderEmail || (updated as any)?.receiverEmail || (updated as any)?.createdByEmail || (existing as any)?.senderEmail || (existing as any)?.receiverEmail || (existing as any)?.createdByEmail || "").trim().toLowerCase(),
      title, message, shipmentId, read: false, createdAt: new Date(),
    });

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
    if (role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { shipmentId: raw } = await context.params;
    const shipmentId = normalizeShipmentId(raw);

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    const existing = await db.collection("shipments").findOne(shipmentIdQuery(shipmentId));
    if (!existing) return NextResponse.json({ error: "Shipment not found" }, { status: 404 });

    await db.collection("shipments").deleteOne(shipmentIdQuery(shipmentId));

    const senderEmail = String((existing as any)?.senderEmail || (existing as any)?.createdByEmail || "").trim().toLowerCase();
    const receiverEmail = String((existing as any)?.receiverEmail || "").trim().toLowerCase();
    const senderName = String((existing as any)?.senderName || "Customer").trim();
    const receiverName = String((existing as any)?.receiverName || "Customer").trim();
    const trackingNumber = String((existing as any)?.trackingNumber || "").trim();

    if (senderEmail) await sendShipmentDeletedEmail(senderEmail, { name: senderName, shipmentId, trackingNumber }).catch(() => null);
    if (receiverEmail) await sendShipmentDeletedEmail(receiverEmail, { name: receiverName, shipmentId, trackingNumber }).catch(() => null);

    return NextResponse.json({ ok: true, deleted: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}