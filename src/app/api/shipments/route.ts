import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { generateShipmentId, generateTrackingNumber } from "@/lib/id";
import {
  DEFAULT_PRICING,
  computeInvoice,
  autoSelectMeans,
  type PricingProfiles,
  type ShipmentMeans,
  type ServiceLevel,
  type ShipmentScope,
  type ShipmentType,
} from "@/lib/pricing";
import {
  sendShipmentCreatedSenderEmail,
  sendShipmentCreatedReceiverEmailV2,
} from "@/lib/email";
import { createNotification } from "@/lib/notifications";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get("limit") || "200"), 500);
    const q = searchParams.get("q") || "";

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    const filter: any = {};
    if (q.trim()) {
      const escaped = q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [
        { shipmentId: { $regex: escaped, $options: "i" } },
        { trackingNumber: { $regex: escaped, $options: "i" } },
        { senderName: { $regex: escaped, $options: "i" } },
        { receiverName: { $regex: escaped, $options: "i" } },
      ];
    }

    const shipments = await db
      .collection("shipments")
      .find(filter)
      .project({
        _id: 0,
        shipmentId: 1,
        trackingNumber: 1,
        senderName: 1,
        senderEmail: 1,
        receiverName: 1,
        receiverEmail: 1,
        status: 1,
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    return NextResponse.json({ shipments });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

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

  serviceLevel?: ServiceLevel | string;
  shipmentScope?: ShipmentScope | string;
  shipmentType?: string;
  packageDescription?: string;
  weightKg?: number;
  dimensionsCm?: DimensionsCm;
  shipmentMeans?: string; // human label e.g. "Air Freight"
  means?: ShipmentMeans;  // canonical key e.g. "air"
  estimatedDeliveryDate?: string | null;
  estimatedDeliveryDateMin?: string | null;

  declaredValue?: number;
  declaredValueCurrency?: string;

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

  // Per-shipment pricing override (admin only):
  // shape: { international?: PricingSettings, local?: PricingSettings }
  pricingOverride?: Partial<PricingProfiles>;
  // Legacy field — also supported, treated as override for the active scope
  pricing?: any;

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

function makeCreatedEventSubEntry(
  type: "pending" | "overdue" | "cancelled" | "paid",
  now: Date
): any {
  const iso = now.toISOString();
  const base = {
    key: "created",
    label: "Created",
    note: "",
    additionalNote: "",
    currentLocation: "",
    occurredAt: iso,
    location: { country: "", state: "", city: "", county: "" },
  };
  if (type === "pending") return { ...base,
    details: "Your shipment has been successfully created. However, your invoice payment is currently pending. Please complete your payment at your earliest convenience to ensure your shipment is processed and dispatched without delay.",
    color: "#f59e0b", detailColor: "#f59e0b",
    badgeText: "Pending Invoice", badgeColor: "#3b82f6", badgeLocked: true,
  };
  if (type === "overdue") return { ...base,
    details: "Your invoice payment is now overdue. To avoid further delays or cancellation of your shipment, we kindly urge you to complete your payment immediately. Please contact our support team if you require assistance or have any concerns regarding your invoice.",
    color: "#ef4444", detailColor: "#ef4444",
    badgeText: "Invoice Overdue", badgeColor: "#ef4444", badgeLocked: true,
  };
  if (type === "cancelled") return { ...base,
    details: "We regret to inform you that your shipment has been cancelled due to non-payment of the outstanding invoice. If you wish to proceed with your shipment, please create a new shipment request or contact our support team for further assistance. If you believe this cancellation was made in error, kindly reach out to us at support@goexoduslogistics.com and we will be happy to assist you.",
    color: "#6b7280", detailColor: "#6b7280",
    badgeText: "Shipment Cancelled", badgeColor: "#6b7280", badgeLocked: true,
  };
  return { ...base,
    details: "Excellent news. Your invoice has been successfully paid. Your shipment is now confirmed and will be progressing to the next phase shortly. You will be notified as soon as there is an update on your shipment status. Thank you for choosing Exodus Logistics.",
    color: "#22c55e", detailColor: "#22c55e",
    badgeText: "Completed", badgeColor: "#22c55e", badgeLocked: false,
  };
}

// Normalize means input — accepts label ("Air Freight") or key ("air")
function normalizeMeans(label?: string, key?: string): ShipmentMeans | null {
  const a = String(key || "").toLowerCase().trim();
  if (a === "air" || a === "sea" || a === "land") return a;
  const b = String(label || "").toLowerCase().trim();
  if (b.includes("air")) return "air";
  if (b.includes("sea") || b.includes("ship") || b.includes("ocean")) return "sea";
  if (b.includes("land") || b.includes("truck") || b.includes("road") || b.includes("van")) return "land";
  return null;
}

function normalizeServiceLevel(v?: string): ServiceLevel {
  const s = String(v || "").toLowerCase().trim();
  if (s === "express") return "Express";
  return "Standard";
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

  const shipmentScope: ShipmentScope =
    String(body.shipmentScope || "").toLowerCase() === "local" ? "local" : "international";

  // Build the pricing profiles used for THIS shipment:
  //   defaults  →  stored profiles  →  per-shipment override
  const storedPricing = await loadPricing(db);

  const overrideContainer: any = body.pricingOverride || {};
  // Legacy fallback: body.pricing was a flat PricingSettings — apply to active scope
  const legacyOverride = body.pricing && typeof body.pricing === "object"
    ? { [shipmentScope]: body.pricing }
    : {};

  const mergedScope = {
    ...DEFAULT_PRICING[shipmentScope],
    ...(storedPricing[shipmentScope] || {}),
    ...(legacyOverride[shipmentScope] || {}),
    ...(overrideContainer[shipmentScope] || {}),
  };

  const pricingForCompute: PricingProfiles = {
    ...DEFAULT_PRICING,
    ...storedPricing,
    international: shipmentScope === "international"
      ? mergedScope
      : { ...DEFAULT_PRICING.international, ...(storedPricing.international || {}) },
    local: shipmentScope === "local"
      ? mergedScope
      : { ...DEFAULT_PRICING.local, ...(storedPricing.local || {}) },
    air: { ...DEFAULT_PRICING.air, ...(storedPricing.air || {}) },
    sea: { ...DEFAULT_PRICING.sea, ...(storedPricing.sea || {}) },
    land: { ...DEFAULT_PRICING.land, ...(storedPricing.land || {}) },
  };

  // Determine means (explicit > derived from label > auto)
  const explicitMeans = normalizeMeans(body.shipmentMeans, body.means);
  const serviceLevel = normalizeServiceLevel(body.serviceLevel as string);
  const shipmentType = String(body.shipmentType || "Parcel") as ShipmentType;
  const weightKg = Number.isFinite(Number(body.weightKg)) ? Number(body.weightKg) : 0;

  const means: ShipmentMeans = explicitMeans
    || autoSelectMeans(shipmentScope, serviceLevel, weightKg, shipmentType);

  // Effective service level (sea/heavy → Standard)
  const effectiveServiceLevel: ServiceLevel =
    means === "sea" ? "Standard" : (weightKg >= 500 ? "Standard" : serviceLevel);

  // Compute invoice using the SAME engine the user dashboard uses
  const breakdown = computeInvoice({
    scope: shipmentScope,
    means,
    serviceLevel: effectiveServiceLevel,
    weightKg,
    declaredValue,
    currency: declaredValueCurrency,
    senderCountryCode,
    receiverCountryCode: destinationCountryCode,
    senderCity: String(body.senderCity || ""),
    senderState: String(body.senderState || ""),
    receiverCity: String(body.receiverCity || ""),
    receiverState: String(body.receiverState || ""),
    pricing: pricingForCompute,
  });

  for (let attempt = 0; attempt < 5; attempt++) {
    const shipmentId = generateShipmentId();
    const trackingNumber = generateTrackingNumber(senderCountryCode);
    const invoiceNumber = makeInvoiceNumber(shipmentId, trackingNumber);

    try {
      const now = new Date();

      const meansLabel =
        means === "air" ? "Air Freight" :
        means === "sea" ? "Sea Freight" : "Land Freight";

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
            details: "",
            note: String(body.statusNote || defaultStatusNote).trim(),
            additionalNote: "",
            occurredAt: now.toISOString(),
            color: "#f59e0b",
            detailColor: "#f59e0b",
            badgeText: "",
            badgeColor: "",
            badgeLocked: false,
            currentLocation: "",
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
          {
            ...makeCreatedEventSubEntry(
              invoiceStatus === "paid" ? "paid"
              : invoiceStatus === "cancelled" ? "cancelled"
              : invoiceStatus === "overdue" ? "overdue"
              : "pending",
              new Date(now.getTime() + 1000)
            ),
            location: {
              country: String(body?.senderCountry || senderCountryCode || "").trim(),
              state: String(body?.senderState || "").trim(),
              city: String(body?.senderCity || "").trim(),
              county: "",
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

        serviceLevel: effectiveServiceLevel,
        shipmentScope,
        shipmentType: body.shipmentType || null,
        packageDescription: String(body.packageDescription || "").trim() || null,
        shipmentMeans: meansLabel,
        means,
        estimatedDeliveryDate: body.estimatedDeliveryDate ? String(body.estimatedDeliveryDate) : null,
        estimatedDeliveryDateMin: body.estimatedDeliveryDateMin ? String(body.estimatedDeliveryDateMin) : null,
        weightKg,
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

          breakdown: { ...breakdown },

          // Snapshot of the exact pricing profile used for this shipment
          // (per-scope flat object, same shape used by the user dashboard's pricingOverride)
          pricingUsed: { ...mergedScope },
        },

        createdAt: now,
        updatedAt: now,
      };

      await db.collection("shipments").insertOne(doc);

      // Dashboard notification for the user who made the shipment
      if (createdByEmail) {
        await createNotification({
          userEmail: createdByEmail,
          userId: createdByUserId || undefined,
          title: "Shipment Created",
          message: `Your shipment ${shipmentId} has been created and is being processed.`,
          shipmentId,
        });
      }

      const APP_URL = (
        process.env.APP_URL ||
        process.env.NEXT_PUBLIC_APP_URL ||
        "https://www.goexoduslogistics.com"
      ).replace(/\/$/, "");

      const viewInvoiceUrl = `${APP_URL}/en/invoice/full?q=${encodeURIComponent(trackingNumber)}`;

      if (senderEmail) {
        try {
          await sendShipmentCreatedSenderEmail(senderEmail, {
            name: doc.senderName || "Customer",
            receiverName: doc.receiverName || "Receiver",
            shipmentId,
            trackingNumber,
            paid: invoicePaid,
            status: invoiceStatus,
            invoiceNumber,
            estimatedDeliveryDate: doc.estimatedDeliveryDate || null,
            estimatedDeliveryDateMin: doc.estimatedDeliveryDateMin || null,
            shipmentScope: doc.shipmentScope || "international",
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
            status: invoiceStatus,
            invoiceNumber,
            estimatedDeliveryDate: doc.estimatedDeliveryDate || null,
            estimatedDeliveryDateMin: doc.estimatedDeliveryDateMin || null,
            shipmentScope: doc.shipmentScope || "international",
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