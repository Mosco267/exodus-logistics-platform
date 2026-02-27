import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { generateShipmentId, generateTrackingNumber } from "@/lib/id";
import {
  DEFAULT_PRICING,
  computeInvoiceFromDeclaredValue,
  type PricingSettings,
} from "@/lib/pricing";
import { sendShipmentCreatedEmail, sendInvoiceStatusEmail } from "@/lib/email";

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

  senderEmail?: string;
  receiverEmail?: string;

  senderCountry?: string;
  senderState?: string;
  destinationCountry?: string;
  destinationState?: string;

  shipmentType?: "Standard" | "Express" | string;
  packageType?: string;
  weightKg?: number;
  dimensionsCm?: { length?: number; width?: number; height?: number };

  declaredValue?: number;

  invoiceCurrency?: "USD" | "EUR" | "GBP" | "NGN" | string;
  invoicePaid?: boolean;

  // Optional: client preview can send it; server will recompute anyway
  invoiceBreakdown?: any;

  // Optional: allow admin override of pricing before create
  pricingOverride?: Partial<PricingSettings>;

  status?: ShipmentStatus | string;
  statusNote?: string;

  createdByUserId?: string;
  createdByEmail?: string;
};

const escapeRegex = (input: string) =>
  input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const ciExact = (field: string, value: string) => ({
  [field]: { $regex: `^${escapeRegex(value)}$`, $options: "i" },
});

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

async function loadPricing(db: any): Promise<PricingSettings> {
  // pricing_settings: { _id: "default", settings: {...} }
  const pricingDoc = await db.collection("pricing_settings").findOne({ _id: "default" });

  const settings = (pricingDoc as any)?.settings;
  if (settings && typeof settings === "object") {
    return {
      ...DEFAULT_PRICING,
      ...settings,
    } as PricingSettings;
  }

  return DEFAULT_PRICING;
}

export async function POST(req: Request) {
  let body: CreateShipmentBody;
  try {
    body = (await req.json()) as CreateShipmentBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const senderCountryCode = (body.senderCountryCode || "").toUpperCase().trim();
  const destinationCountryCode = (body.destinationCountryCode || "").toUpperCase().trim();

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

  const declaredValue = Number(body.declaredValue ?? 0);
  if (!Number.isFinite(declaredValue) || declaredValue <= 0) {
    return NextResponse.json(
      { error: "declaredValue must be a valid number > 0" },
      { status: 400 }
    );
  }

  const invoiceCurrency = String(body.invoiceCurrency || "USD").toUpperCase();
  const invoicePaid = Boolean(body.invoicePaid);

  const statusTitle = toTitleStatus(typeof body.status === "string" ? body.status : "Created");

  const defaultStatusNote =
    statusTitle === "Created"
      ? "Shipment has been created and is being processed."
      : `Shipment status updated to ${statusTitle}.`;

  const createdByUserId = String(body.createdByUserId || "").trim() || null;
  const createdByEmail = String(body.createdByEmail || "").trim().toLowerCase() || null;

  const senderEmail = String(body.senderEmail || "").trim().toLowerCase() || null;
  const receiverEmail = String(body.receiverEmail || "").trim().toLowerCase() || null;

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB);

  // Pricing from DB (or default) + optional override
  const basePricing = await loadPricing(db);
  const pricing: PricingSettings = {
    ...basePricing,
    ...(body.pricingOverride || {}),
  };

  const breakdown = computeInvoiceFromDeclaredValue(declaredValue, pricing);
  const invoiceAmount = breakdown.total;

  for (let attempt = 0; attempt < 5; attempt++) {
    const shipmentId = generateShipmentId();
    const trackingNumber = generateTrackingNumber(senderCountryCode);

    try {
      const now = new Date();

      const doc = {
        shipmentId,
        trackingNumber,
        senderCountryCode,
        destinationCountryCode,

        senderCountry: body.senderCountry || null,
        senderState: body.senderState || null,
        destinationCountry: body.destinationCountry || null,
        destinationState: body.destinationState || null,

        shipmentType: body.shipmentType || "Standard",
        packageType: body.packageType || null,
        weightKg: Number(body.weightKg || 0) || null,
        dimensionsCm: {
          length: Number(body.dimensionsCm?.length || 0) || null,
          width: Number(body.dimensionsCm?.width || 0) || null,
          height: Number(body.dimensionsCm?.height || 0) || null,
        },

        declaredValue: breakdown.declaredValue,

        createdByUserId,
        createdByEmail,

        status: statusTitle,
        statusNote: String(body.statusNote || defaultStatusNote).trim(),
        statusUpdatedAt: now,
        cancelledAt: null,

        invoice: {
          amount: invoiceAmount,
          currency: invoiceCurrency,
          paid: invoicePaid,
          paidAt: invoicePaid ? now : null,
          breakdown,         // ✅ amounts
          rates: pricing,    // ✅ percentages/rates
        },

        senderName: body.senderName || null,
        receiverName: body.receiverName || null,
        senderEmail,
        receiverEmail,

        createdAt: now,
        updatedAt: now,
      };

      await db.collection("shipments").insertOne(doc);

      // ✅ Send emails (do not fail shipment creation if email fails)
      try {
        const APP_URL = (process.env.PUBLIC_APP_URL || "https://www.goexoduslogistics.com").replace(/\/$/, "");

        const viewShipmentUrl = `${APP_URL}/${encodeURIComponent("en")}/track?q=${encodeURIComponent(
          trackingNumber || shipmentId
        )}`;

        const viewInvoiceUrl = `${APP_URL}/${encodeURIComponent("en")}/invoice/full?q=${encodeURIComponent(
          shipmentId
        )}`;

        // Sender emails
        if (senderEmail) {
          await sendShipmentCreatedEmail(senderEmail, {
            name: doc.senderName || "Customer",
            receiverName: doc.receiverName || "Receiver",
            shipmentId: doc.shipmentId,
            trackingNumber: doc.trackingNumber,
            viewShipmentUrl,
          });

          await sendInvoiceStatusEmail(senderEmail, {
            name: doc.senderName || "Customer",
            shipmentId: doc.shipmentId,
            trackingNumber: doc.trackingNumber,
            paid: doc.invoice.paid,
            viewInvoiceUrl,
          });
        }

        // Receiver emails
        if (receiverEmail) {
          await sendShipmentCreatedEmail(receiverEmail, {
            name: doc.receiverName || "Customer",
            receiverName: doc.receiverName || "Receiver",
            shipmentId: doc.shipmentId,
            trackingNumber: doc.trackingNumber,
            viewShipmentUrl,
          });

          await sendInvoiceStatusEmail(receiverEmail, {
            name: doc.receiverName || "Customer",
            shipmentId: doc.shipmentId,
            trackingNumber: doc.trackingNumber,
            paid: doc.invoice.paid,
            viewInvoiceUrl,
          });
        }
      } catch (emailErr) {
        console.error("Email error:", emailErr);
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