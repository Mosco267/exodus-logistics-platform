import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { generateShipmentId, generateTrackingNumber } from "@/lib/id";
import { computeInvoiceFromDeclaredValue, DEFAULT_PRICING, type PricingSettings } from "@/lib/pricing";
import { sendShipmentCreatedEmail, sendShipmentIncomingEmail, sendInvoiceStatusEmail } from "@/lib/email";
import type { Collection, Db } from "mongodb";

type ShipmentStatus =
  | "Delivered"
  | "In Transit"
  | "Custom Clearance"
  | "Unclaimed"
  | "Created";

type CreateShipmentBody = {
  senderCountryCode: string;
  destinationCountryCode: string;

  senderName?: string;
  receiverName?: string;

  // ✅ emails (needed to send to both people)
  senderEmail?: string;
  receiverEmail?: string;

  // ✅ addresses (for email text + invoice “advanced route”)
  senderAddress?: string;
  senderState?: string;
  senderCity?: string;

  receiverAddress?: string;
  receiverState?: string;
  receiverCity?: string;

  // ✅ shipment details for invoice
  shipmentType?: string; // e.g. "Documents", "Parcel", "Cargo"
  serviceLevel?: "Express" | "Standard" | string;
  weightKg?: number;
  dimensionsCm?: { length?: number; width?: number; height?: number };

  // ✅ declared value drives invoice breakdown
  declaredValue?: number;
  declaredValueCurrency?: "USD" | "EUR" | "GBP" | "NGN" | string;

  // ✅ pricing overrides you choose while creating shipment
  pricing?: Partial<PricingSettings>;

  // invoice stored
  invoiceAmount?: number;
  invoiceCurrency?: "USD" | "EUR" | "GBP" | "NGN" | string;
  invoicePaid?: boolean;

  status?: ShipmentStatus | string;
  statusNote?: string;

  createdByUserId?: string;
  createdByEmail?: string;
};

const normalizeStatus = (status?: string) =>
  (status ?? "")
    .toLowerCase()
    .trim()
    .replace(/[\s_-]+/g, "");

function toTitleStatus(input?: string): ShipmentStatus {
  const s = normalizeStatus(input);
  if (s === "delivered") return "Delivered";
  if (s === "intransit") return "In Transit";
  if (s === "customclearance") return "Custom Clearance";
  if (s === "unclaimed") return "Unclaimed";
  return "Created";
}

async function loadPricing(db: Db): Promise<PricingSettings> {
  // ✅ typed so Vercel TS won’t complain about _id type
  const col = db.collection<{ _id: string; settings: PricingSettings }>("pricing_settings");
  const doc = await col.findOne({ _id: "default" });
  return (doc?.settings as PricingSettings) || DEFAULT_PRICING;
}

export async function POST(req: Request) {
  let body: CreateShipmentBody;
  try {
    body = (await req.json()) as CreateShipmentBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const senderCountryCode = (body.senderCountryCode || "").toUpperCase();
  const destinationCountryCode = (body.destinationCountryCode || "").toUpperCase();

  if (!senderCountryCode || senderCountryCode.length !== 2) {
    return NextResponse.json(
      { error: "senderCountryCode must be 2 letters (e.g. US)" },
      { status: 400 }
    );
  }

  if (!destinationCountryCode || destinationCountryCode.length !== 2) {
    return NextResponse.json(
      { error: "destinationCountryCode must be 2 letters (e.g. NG)" },
      { status: 400 }
    );
  }

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB);

  // ✅ load default pricing and apply any overrides from admin form
  const basePricing = await loadPricing(db);
  const pricing: PricingSettings = { ...basePricing, ...(body.pricing || {}) };

  // ✅ declared value (optional but recommended)
  const declaredValue = Number(body.declaredValue ?? 0);
  if (!Number.isFinite(declaredValue) || declaredValue < 0) {
    return NextResponse.json({ error: "declaredValue must be a number >= 0" }, { status: 400 });
  }

  // ✅ compute breakdown if declaredValue provided (>0)
  const breakdown =
    declaredValue > 0 ? computeInvoiceFromDeclaredValue(declaredValue, pricing) : null;

  // ✅ if admin explicitly set invoiceAmount, keep it; otherwise use breakdown total
  const invoiceAmountFromBody = Number(body.invoiceAmount ?? NaN);
  const invoiceAmount =
    Number.isFinite(invoiceAmountFromBody) ? invoiceAmountFromBody : Number(breakdown?.total ?? 0);

  if (!Number.isFinite(invoiceAmount) || invoiceAmount < 0) {
    return NextResponse.json({ error: "invoiceAmount must be a valid number >= 0" }, { status: 400 });
  }

  const invoiceCurrency = String(body.invoiceCurrency || body.declaredValueCurrency || "USD").toUpperCase();
  const invoicePaid = Boolean(body.invoicePaid);

  const status = typeof body.status === "string" ? body.status : "Created";
  const statusTitle = toTitleStatus(status);

  const defaultStatusNote =
    statusTitle === "Created"
      ? "Shipment has been created and is being processed."
      : `Shipment status updated to ${statusTitle}.`;

  const createdByUserId = String(body.createdByUserId || "").trim() || null;
  const createdByEmail = String(body.createdByEmail || "").trim().toLowerCase() || null;

  const senderEmail = String(body.senderEmail || "").trim().toLowerCase() || null;
  const receiverEmail = String(body.receiverEmail || "").trim().toLowerCase() || null;

  for (let attempt = 0; attempt < 5; attempt++) {
    const shipmentId = generateShipmentId();
    const trackingNumber = generateTrackingNumber(senderCountryCode);

    try {
      const now = new Date();

      const doc: any = {
        shipmentId,
        trackingNumber,
        senderCountryCode,
        destinationCountryCode,

        createdByUserId,
        createdByEmail,

        status: statusTitle,
        statusNote: (body.statusNote || defaultStatusNote).trim(),
        statusUpdatedAt: now,
        cancelledAt: null,

        // ✅ save shipment details for invoice
        senderName: body.senderName || null,
        receiverName: body.receiverName || null,

        senderEmail,
        receiverEmail,

        senderAddress: body.senderAddress || null,
        senderState: body.senderState || null,
        senderCity: body.senderCity || null,

        receiverAddress: body.receiverAddress || null,
        receiverState: body.receiverState || null,
        receiverCity: body.receiverCity || null,

        shipmentType: body.shipmentType || null,
        serviceLevel: body.serviceLevel || null,
        weightKg: Number.isFinite(Number(body.weightKg)) ? Number(body.weightKg) : null,
        dimensionsCm: body.dimensionsCm || null,

        declaredValue: declaredValue || 0,
        declaredValueCurrency: String(body.declaredValueCurrency || invoiceCurrency || "USD").toUpperCase(),

        // ✅ invoice (store BOTH amounts + rates used so UI percent matches admin)
        invoice: {
          amount: invoiceAmount,
          currency: invoiceCurrency,
          paid: invoicePaid,
          paidAt: invoicePaid ? now : null,
          breakdown: breakdown
            ? {
                ...breakdown,
                rates: {
                  shippingRate: pricing.shippingRate,
                  insuranceRate: pricing.insuranceRate,
                  fuelRate: pricing.fuelRate,
                  customsRate: pricing.customsRate,
                  discountRate: pricing.discountRate,
                  taxRate: pricing.taxRate,
                },
              }
            : null,
        },

        createdAt: now,
        updatedAt: now,
      };

      await db.collection("shipments").insertOne(doc);

      // ✅ Send emails to BOTH sender + receiver
      // view links (public pages, no sign-in needed)
      const viewShipmentUrl = `${process.env.PUBLIC_APP_URL || "https://www.goexoduslogistics.com"}/en/track?q=${encodeURIComponent(
        shipmentId
      )}`;
      const viewInvoiceUrl = `${process.env.PUBLIC_APP_URL || "https://www.goexoduslogistics.com"}/en/invoice/full?q=${encodeURIComponent(
        shipmentId
      )}`;

      // Sender: shipment created email
      if (senderEmail) {
        await sendShipmentCreatedEmail(senderEmail, {
          name: body.senderName || "Customer",
          receiverName: body.receiverName || "Receiver",
          shipmentId,
          trackingNumber,
          viewShipmentUrl,
        });
        await sendInvoiceStatusEmail(senderEmail, {
          name: body.senderName || "Customer",
          shipmentId,
          trackingNumber,
          paid: invoicePaid,
          viewInvoiceUrl,
        });
      }

      // Receiver: shipment incoming email + invoice status email
      if (receiverEmail) {
        await sendShipmentIncomingEmail(receiverEmail, {
          name: body.receiverName || "Customer",
          senderName: body.senderName || "Sender",
          receiverAddress:
            [body.receiverAddress, body.receiverCity, body.receiverState, destinationCountryCode]
              .filter(Boolean)
              .join(", ") || "your address",
          shipmentId,
          trackingNumber,
          viewShipmentUrl,
        });

        await sendInvoiceStatusEmail(receiverEmail, {
          name: body.receiverName || "Customer",
          shipmentId,
          trackingNumber,
          paid: invoicePaid,
          viewInvoiceUrl,
        });
      }

      return NextResponse.json({ ok: true, shipment: doc }, { status: 201 });
    } catch (err: any) {
      if (err?.code === 11000) continue;
      return NextResponse.json(
        { error: "Failed to create shipment.", details: String(err?.message || err) },
        { status: 500 }
      );
    }
  }

  return NextResponse.json(
    { error: "Could not generate a unique ID, try again." },
    { status: 500 }
  );
}