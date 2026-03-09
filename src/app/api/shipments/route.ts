import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { generateShipmentId, generateTrackingNumber } from "@/lib/id";
import {
  DEFAULT_PRICING,
  computeInvoiceFromDeclaredValue,
  type PricingSettings,
  type PricingProfiles,
} from "@/lib/pricing";
import {
  sendShipmentCreatedSenderEmail,
  sendShipmentCreatedReceiverEmailV2,
} from "@/lib/email";

type ShipmentStatus =
  | "Delivered"
  | "In Transit"
  | "Custom Clearance"
  | "Unclaimed"
  | "Created";

type DimensionsCm = { length: number; width: number; height: number };

type InvoiceStatus = "paid" | "unpaid" | "overdue" | "cancelled";

type CreateShipmentBody = {
  senderCountryCode: string;
  destinationCountryCode: string;

  senderName?: string;
  receiverName?: string;

  senderEmail?: string;
  receiverEmail?: string;

  senderCountry?: string;
  senderState?: string;
  senderCity?: string;
  senderAddress?: string;
  senderPostalCode?: string;
  senderPhone?: string;

  receiverCountry?: string;
  receiverState?: string;
  receiverCity?: string;
  receiverAddress?: string;
  receiverPostalCode?: string;
  receiverPhone?: string;

  serviceLevel?: "Express" | "Standard" | string;
  shipmentScope?: "international" | "local" | string;
  shipmentType?: string;
  weightKg?: number;
  dimensionsCm?: DimensionsCm;
  shipmentMeans?: string;
  estimatedDeliveryDate?: string | null;

  declaredValue?: number;
  declaredValueCurrency?: "USD" | "EUR" | "GBP" | "NGN" | string;

  invoicePaid?: boolean;
  invoiceStatus?: InvoiceStatus;
  invoiceDueDate?: string | null;
  invoicePaymentMethod?: string | null;

  invoice?: {
    paid?: boolean;
    status?: InvoiceStatus;
    dueDate?: string | null;
    paymentMethod?: string | null;
  };

  pricing?: Partial<PricingSettings>;

  status?: ShipmentStatus | string;
  statusNote?: string;

  createdByUserId?: string;
  createdByEmail?: string;
};

const normalizeStatus = (status?: string) =>
  (status ?? "").toLowerCase().trim().replace(/[\s_-]+/g, "");

function toTitleStatus(input?: string): ShipmentStatus {
  const s = normalizeStatus(input);
  if (s === "delivered") return "Delivered";
  if (s === "intransit") return "In Transit";
  if (s === "customclearance") return "Custom Clearance";
  if (s === "unclaimed") return "Unclaimed";
  return "Created";
}

async function loadPricing(db: any): Promise<PricingProfiles> {
  const doc = await db.collection("pricing_settings").findOne({ _id: "default" });
  return (doc as any)?.settings || DEFAULT_PRICING;
}

function makeInvoiceNumber(seedA: string, seedB: string) {
  const now = new Date();
  const yyyy = String(now.getFullYear());
  const mm = String(now.getMonth() + 1).padStart(2, "0");

  const seed = `${seedA}::${seedB}`;
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const seven = String((h % 9000000) + 1000000);

  return `EXS-INV-${yyyy}-${mm}-${seven}`;
}

function cleanStr(v: any) {
  const s = String(v ?? "").trim();
  return s || "";
}

function normalizeInvoiceStatus(v: any): InvoiceStatus | null {
  const s = cleanStr(v).toLowerCase();
  if (s === "paid") return "paid";
  if (s === "unpaid") return "unpaid";
  if (s === "overdue") return "overdue";
  if (s === "cancelled" || s === "canceled") return "cancelled";
  return null;
}

function computeInvoiceStatus(paid: boolean, dueDate?: string | null): InvoiceStatus {
  if (paid) return "paid";
  if (!dueDate) return "unpaid";

  const d = new Date(dueDate);
  if (Number.isNaN(d.getTime())) return "unpaid";
  return Date.now() > d.getTime() ? "overdue" : "unpaid";
}

export async function POST(req: Request) {
  let body: CreateShipmentBody;

  try {
    body = (await req.json()) as CreateShipmentBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const senderCountryCode = String(body.senderCountryCode || "").toUpperCase().trim();
  const destinationCountryCode = String(body.destinationCountryCode || "").toUpperCase().trim();

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

  const senderEmail = String(body.senderEmail || "").trim().toLowerCase() || null;
  const receiverEmail = String(body.receiverEmail || "").trim().toLowerCase() || null;

  const declaredValue = Number(body.declaredValue ?? 0);
  if (!Number.isFinite(declaredValue) || declaredValue < 0) {
    return NextResponse.json(
      { error: "declaredValue must be a valid number >= 0" },
      { status: 400 }
    );
  }

  const declaredValueCurrency = String(body.declaredValueCurrency || "USD").toUpperCase();

  const incomingInvoice = body.invoice || {};

  

  const invoiceDueDate =
    incomingInvoice.dueDate !== undefined
      ? (incomingInvoice.dueDate ? String(incomingInvoice.dueDate) : null)
      : body.invoiceDueDate
      ? String(body.invoiceDueDate)
      : null;

  const invoicePaymentMethodRaw =
    incomingInvoice.paymentMethod !== undefined
      ? incomingInvoice.paymentMethod
      : body.invoicePaymentMethod;

  const invoicePaymentMethod = cleanStr(invoicePaymentMethodRaw) || null;

 const explicitInvoiceStatus = normalizeInvoiceStatus(
  incomingInvoice.status ?? body.invoiceStatus
);

let invoiceStatus: InvoiceStatus;

if (explicitInvoiceStatus === "paid" || explicitInvoiceStatus === "cancelled") {
  invoiceStatus = explicitInvoiceStatus;
} else if (invoiceDueDate) {
  const computed = computeInvoiceStatus(false, invoiceDueDate);
  invoiceStatus = computed === "overdue" ? "overdue" : (explicitInvoiceStatus || "unpaid");
} else {
  invoiceStatus = explicitInvoiceStatus || "unpaid";
}

const invoicePaid = invoiceStatus === "paid";

  const statusTitle = toTitleStatus(body.status || "Created");

  const defaultStatusNote =
    statusTitle === "Created"
      ? "Shipment has been created and is being processed."
      : `Shipment status updated to ${statusTitle}.`;

  const createdByUserId = String(body.createdByUserId || "").trim() || null;
  const createdByEmail = String(body.createdByEmail || "").trim().toLowerCase() || null;

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB);

  const shipmentScope =
  String(body.shipmentScope || "").toLowerCase() === "local"
    ? "local"
    : "international";

const allPricing = await loadPricing(db);
const basePricing = allPricing[shipmentScope] || DEFAULT_PRICING[shipmentScope];
const pricingUsed: PricingSettings = { ...basePricing, ...(body.pricing || {}) };

  const breakdown = computeInvoiceFromDeclaredValue(declaredValue, pricingUsed);

  for (let attempt = 0; attempt < 5; attempt++) {
    const shipmentId = generateShipmentId();
    const trackingNumber = generateTrackingNumber(senderCountryCode);
    const invoiceNumber = makeInvoiceNumber(shipmentId, trackingNumber);

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
        statusNote: String(body.statusNote || defaultStatusNote).trim(),
        statusUpdatedAt: now,
        cancelledAt: null,

        trackingEvents: [
          {
            key: "created",
            label: statusTitle || "Created",
            note: String(body.statusNote || defaultStatusNote).trim(),
            occurredAt: now.toISOString(),
            color:
      invoiceStatus === "paid"
        ? "#22c55e"
        : invoiceStatus === "cancelled"
        ? "#ef4444"
        : "#f59e0b",
            location: {
              country: String(body?.senderCountry || senderCountryCode || "").trim(),
              state: String(body?.senderState || "").trim(),
              city: String(body?.senderCity || "").trim(),
              county: "",
            },
            meta: {
              invoicePaid,
              invoiceAmount: Number(breakdown.total),
              currency: declaredValueCurrency,
              origin: [body?.senderCity, body?.senderState, body?.senderCountry]
                .map((x: any) => String(x || "").trim())
                .filter(Boolean)
                .join(", "),
              destination: [body?.receiverCity, body?.receiverState, body?.receiverCountry]
                .map((x: any) => String(x || "").trim())
                .filter(Boolean)
                .join(", "),
            },
          },
        ],

        senderName: body.senderName || null,
        receiverName: body.receiverName || null,
        senderEmail,
        receiverEmail,

        senderCountry: body.senderCountry || null,
        senderState: body.senderState || null,
        senderCity: body.senderCity || null,
        senderAddress: body.senderAddress || null,
        senderPostalCode: body.senderPostalCode || null,
        senderPhone: body.senderPhone || null,

        receiverCountry: body.receiverCountry || null,
        receiverState: body.receiverState || null,
        receiverCity: body.receiverCity || null,
        receiverAddress: body.receiverAddress || null,
        receiverPostalCode: body.receiverPostalCode || null,
        receiverPhone: body.receiverPhone || null,

        serviceLevel: body.serviceLevel || "Standard",
        shipmentScope,
        shipmentType: body.shipmentType || null,
        shipmentMeans: body.shipmentMeans || null,
        estimatedDeliveryDate: body.estimatedDeliveryDate ? String(body.estimatedDeliveryDate) : null,
        weightKg: Number.isFinite(Number(body.weightKg)) ? Number(body.weightKg) : null,
        dimensionsCm: body.dimensionsCm || null,

        declaredValue: breakdown.declaredValue,
        declaredValueCurrency,

        invoice: {
          invoiceNumber,
          amount: breakdown.total,
          currency: declaredValueCurrency,

          paid: invoicePaid,
          paidAt: invoicePaid ? now : null,

          status: invoiceStatus,
          dueDate: invoiceDueDate,
          paymentMethod: invoicePaymentMethod,

          breakdown: {
            ...breakdown,
          },

          pricingUsed: {
            ...pricingUsed,
          },
        },

        createdAt: now,
        updatedAt: now,
      };

      await db.collection("shipments").insertOne(doc);

      const APP_URL = (
        process.env.APP_URL ||
        process.env.NEXT_PUBLIC_APP_URL ||
        "https://www.goexoduslogistics.com"
      ).replace(/\/$/, "");

      const viewInvoiceUrl = `${APP_URL}/en/invoice/full?q=${encodeURIComponent(shipmentId)}`;

      if (senderEmail) {
        try {
          await sendShipmentCreatedSenderEmail(senderEmail, {
  name: doc.senderName || "Customer",
  receiverName: doc.receiverName || "Receiver",
  shipmentId,
  trackingNumber,
  paid: invoicePaid,
  invoiceNumber,
  estimatedDeliveryDate: doc.estimatedDeliveryDate || null,
  viewInvoiceUrl,
});
        } catch (e) {
          console.error("Sender email failed:", e);
        }
      }

      if (receiverEmail) {
        try {
          await sendShipmentCreatedReceiverEmailV2(receiverEmail, {
  name: doc.receiverName || "Customer",
  senderName: doc.senderName || "Sender",
  shipmentId,
  trackingNumber,
  paid: invoicePaid,
  invoiceNumber,
  estimatedDeliveryDate: doc.estimatedDeliveryDate || null,
  viewInvoiceUrl,
});
        } catch (e) {
          console.error("Receiver email failed:", e);
        }
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