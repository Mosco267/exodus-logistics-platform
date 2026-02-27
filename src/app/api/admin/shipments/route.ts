import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { auth } from "@/auth";
import { computeInvoiceFromDeclaredValue, DEFAULT_PRICING } from "@/lib/pricing";
import { sendShipmentCreatedEmail, sendInvoiceStatusEmail } from "@/lib/email";

function toRate(v: any) {
  const n = Number(v);
  if (!Number.isFinite(n)) return undefined;
  return n > 1 ? n / 100 : n;
}

function cleanUpper(v: any) {
  return String(v || "").trim().toUpperCase();
}

function genShipmentId() {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `EXS-${yy}${mm}${dd}-${rand}`;
}

function genTrackingNumber() {
  return `EX${Math.random().toString(36).slice(2, 6).toUpperCase()}US${Math.floor(100000 + Math.random() * 900000)}`;
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    const role = String((session as any)?.user?.role || "").toUpperCase();
    if (role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

    const declaredValue = Number(body.declaredValue);
    if (!Number.isFinite(declaredValue) || declaredValue <= 0) {
      return NextResponse.json({ error: "declaredValue must be > 0" }, { status: 400 });
    }

    const currency = cleanUpper(body.currency || "USD");

    const senderEmail = String(body?.senderEmail || "").trim().toLowerCase();
    const receiverEmail = String(body?.receiverEmail || "").trim().toLowerCase();
    if (!senderEmail || !receiverEmail) {
      return NextResponse.json({ error: "senderEmail and receiverEmail are required" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    // Load base pricing
    const pricingDoc = await db.collection("pricing_settings").findOne(
      { key: "default" } as any,
      { projection: { _id: 0 } }
    );
    const basePricing = (pricingDoc as any)?.settings || DEFAULT_PRICING;

    // Optional per-shipment overrides (do NOT change global pricing)
    const o = body?.pricingOverride || {};
    const pricing = {
      ...basePricing,
      shippingRate: toRate(o.shippingRate) ?? basePricing.shippingRate,
      insuranceRate: toRate(o.insuranceRate) ?? basePricing.insuranceRate,
      fuelRate: toRate(o.fuelRate) ?? basePricing.fuelRate,
      customsRate: toRate(o.customsRate) ?? basePricing.customsRate,
      taxRate: toRate(o.taxRate) ?? basePricing.taxRate,
      discountRate: toRate(o.discountRate) ?? basePricing.discountRate,
    };

    const breakdown = computeInvoiceFromDeclaredValue(declaredValue, pricing);

    const paid = Boolean(body?.invoicePaid); // default false if missing
    const nowIso = new Date().toISOString();

    const shipmentId = genShipmentId();
    const trackingNumber = genTrackingNumber();

    const doc: any = {
      shipmentId,
      trackingNumber,

      // shipment details
      serviceLevel: String(body?.serviceLevel || "standard").toLowerCase(), // "express"|"standard"
      shipmentType: String(body?.shipmentType || "parcel").toLowerCase(),   // your choice

      package: {
        weightKg: Number(body?.weightKg || 0),
        lengthCm: Number(body?.lengthCm || 0),
        widthCm: Number(body?.widthCm || 0),
        heightCm: Number(body?.heightCm || 0),
      },

      declaredValue,
      currency,

      // sender
      senderName: String(body?.senderName || "Sender").trim(),
      senderEmail,
      senderPhone: String(body?.senderPhone || "").trim(),
      senderAddress1: String(body?.senderAddress1 || "").trim(),
      senderCity: String(body?.senderCity || "").trim(),
      senderState: String(body?.senderState || "").trim(),
      senderPostalCode: String(body?.senderPostalCode || "").trim(),
      senderCountry: String(body?.senderCountry || "").trim(),
      senderCountryCode: cleanUpper(body?.senderCountryCode || ""),

      // receiver
      receiverName: String(body?.receiverName || "Receiver").trim(),
      receiverEmail,
      receiverPhone: String(body?.receiverPhone || "").trim(),
      receiverAddress1: String(body?.receiverAddress1 || "").trim(),
      receiverCity: String(body?.receiverCity || "").trim(),
      receiverState: String(body?.receiverState || "").trim(),
      receiverPostalCode: String(body?.receiverPostalCode || "").trim(),
      receiverCountry: String(body?.receiverCountry || "").trim(),
      receiverCountryCode: cleanUpper(body?.receiverCountryCode || ""),

      // status
      status: "Preparing Shipment",
      statusNote: "Shipment created. Preparing for dispatch.",
      nextStep: "Awaiting pickup / dispatch.",
      statusUpdatedAt: new Date(),

      // invoice snapshot
      invoice: {
        amount: breakdown.total,
        currency,
        paid,
        paidAt: paid ? nowIso : null,
        breakdown,
        pricingSnapshot: pricing, // so % shown later matches what admin used
      },

      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.collection("shipments").insertOne(doc);

    // Email links (public, no login)
    const APP_URL = String(process.env.APP_URL || "").replace(/\/$/, "");
    const viewShipmentUrl = `${APP_URL}/en/track?q=${encodeURIComponent(trackingNumber)}`;
    const viewInvoiceUrl = `${APP_URL}/en/invoice/full?q=${encodeURIComponent(shipmentId)}`;

    // Send emails (sender + receiver)
    await sendShipmentCreatedEmail(senderEmail, {
      name: doc.senderName,
      receiverName: doc.receiverName,
      shipmentId,
      trackingNumber,
      viewShipmentUrl,
    }).catch(() => null);

    await sendShipmentCreatedEmail(receiverEmail, {
      name: doc.receiverName,
      receiverName: doc.receiverName,
      shipmentId,
      trackingNumber,
      viewShipmentUrl,
    }).catch(() => null);

    await sendInvoiceStatusEmail(senderEmail, {
      name: doc.senderName,
      shipmentId,
      trackingNumber,
      paid,
      viewInvoiceUrl,
    }).catch(() => null);

    await sendInvoiceStatusEmail(receiverEmail, {
      name: doc.receiverName,
      shipmentId,
      trackingNumber,
      paid,
      viewInvoiceUrl,
    }).catch(() => null);

    return NextResponse.json({ ok: true, shipmentId, trackingNumber });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}