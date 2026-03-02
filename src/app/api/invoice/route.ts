import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { DEFAULT_PRICING } from "@/lib/pricing";

const escapeRegex = (input: string) => input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const ciExact = (field: string, value: string) => ({
  [field]: { $regex: `^${escapeRegex(value)}$`, $options: "i" },
});

type PricingSettingsDoc = { _id: string; settings: any };

type CompanySettingsDoc = {
  _id: string; // "default"
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
  registrationNumber?: string;
};

function cleanStr(v: any) {
  const s = String(v ?? "").trim();
  return s || "";
}

function normUpper(v: any) {
  return cleanStr(v).toUpperCase();
}

function joinNice(parts: Array<any>) {
  return parts
    .map((x) => String(x || "").trim())
    .filter(Boolean)
    .join(", ");
}

// invoice format: EXS-INV-YYYY-MM-1234567
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

type InvoiceStatus = "paid" | "pending" | "overdue" | "cancelled";

function normalizeInvoiceStatus(v: any): InvoiceStatus | null {
  const s = cleanStr(v).toLowerCase();
  if (s === "paid") return "paid";
  if (s === "pending") return "pending";
  if (s === "overdue") return "overdue";
  if (s === "cancelled" || s === "canceled") return "cancelled";
  return null;
}

function computeInvoiceStatus(paid: boolean, dueDate?: string | null) {
  if (paid) return "paid" as const;
  if (!dueDate) return "pending" as const;

  const d = new Date(dueDate);
  if (Number.isNaN(d.getTime())) return "pending" as const;
  return Date.now() > d.getTime() ? ("overdue" as const) : ("pending" as const);
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);

    // Option A: /api/invoice?q=TRACKING_OR_SHIPMENT
    const q = cleanStr(url.searchParams.get("q"));

    // Option B: /api/invoice?invoice=...&email=...
    const invoiceParam = cleanStr(url.searchParams.get("invoice"));
    const emailParam = cleanStr(url.searchParams.get("email")).toLowerCase();

    if (!q && !invoiceParam) {
      return NextResponse.json({ error: "Provide q OR invoice (+ email)." }, { status: 400 });
    }

    const dbName = process.env.MONGODB_DB;
    if (!dbName) {
      return NextResponse.json(
        { error: "Server is missing MONGODB_DB environment variable." },
        { status: 500 }
      );
    }

    const client = await clientPromise;
    const db = client.db(dbName);

    // Company settings
    const companyDoc = await db
      .collection<CompanySettingsDoc>("company_settings")
      .findOne({ _id: "default" });

    const company = {
      name: companyDoc?.name || "Exodus Logistics Ltd.",
      address: companyDoc?.address || "1199 E Calaveras Blvd, California, USA 90201",
      phone: companyDoc?.phone || "+1 (516) 243-7836",
      email: companyDoc?.email || "support@goexoduslogistics.com",
      registrationNumber: companyDoc?.registrationNumber || "",
    };

    // Pricing settings (rates)
    const pricingDoc = await db
      .collection<PricingSettingsDoc>("pricing_settings")
      .findOne({ _id: "default" });

    const pricing = (pricingDoc as any)?.settings || DEFAULT_PRICING;

    const rates = {
      shippingRate: pricing?.shippingRate ?? pricing?.shipping ?? null,
      insuranceRate: pricing?.insuranceRate ?? pricing?.insurance ?? null,
      fuelRate: pricing?.fuelRate ?? pricing?.fuel ?? null,
      customsRate: pricing?.customsRate ?? pricing?.customs ?? null,
      taxRate: pricing?.taxRate ?? pricing?.tax ?? null,
      discountRate: pricing?.discountRate ?? pricing?.discount ?? null,
    };

    let shipment: any | null = null;

    // Secure: invoice + email
    if (invoiceParam) {
      if (!emailParam) {
        return NextResponse.json({ error: "email is required when using invoice." }, { status: 400 });
      }

      const invUpper = normUpper(invoiceParam);

      shipment = await db.collection("shipments").findOne(
        { "invoice.invoiceNumber": invUpper },
        { projection: { _id: 0 } }
      );

      if (!shipment) {
        return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
      }

      const senderEmail = cleanStr(shipment?.senderEmail).toLowerCase();
      const receiverEmail = cleanStr(shipment?.receiverEmail).toLowerCase();
      const createdByEmail = cleanStr(shipment?.createdByEmail).toLowerCase();

      const ok = emailParam === senderEmail || emailParam === receiverEmail || emailParam === createdByEmail;

      if (!ok) {
        return NextResponse.json({ error: "Invoice/email mismatch." }, { status: 403 });
      }
    }

    // Simple: q = tracking/shipment
    if (!shipment && q) {
      const qq = normUpper(q);
      shipment = await db.collection("shipments").findOne(
        { $or: [ciExact("trackingNumber", qq), ciExact("shipmentId", qq)] },
        { projection: { _id: 0 } }
      );

      if (!shipment) {
        return NextResponse.json({ error: "Shipment not found" }, { status: 404 });
      }
    }

    const s: any = shipment;
    const inv = s?.invoice || {};

    const invoiceNumber =
      normUpper(inv?.invoiceNumber) || makeInvoiceNumber(cleanStr(s?.shipmentId), cleanStr(s?.trackingNumber));

    const amount = Number(inv?.amount ?? 0);
    const currency = normUpper(inv?.currency || "USD") || "USD";
    const paid = Boolean(inv?.paid);
    const dueDate = inv?.dueDate ? String(inv.dueDate) : null;

    // allow admin override status (cancelled, etc.)
    const explicitStatus = normalizeInvoiceStatus(inv?.status || inv?.invoiceStatus);
    const computedStatus = computeInvoiceStatus(paid, dueDate);
    const status: InvoiceStatus = explicitStatus || (computedStatus as InvoiceStatus);

    const paymentMethod = cleanStr(inv?.paymentMethod) ? cleanStr(inv?.paymentMethod) : null;

    const declaredValueRaw = s?.declaredValue ?? s?.packageValue ?? inv?.breakdown?.declaredValue ?? 0;
    const declaredValue = Number(declaredValueRaw) || 0;

    const breakdownFromDb = inv?.breakdown ?? null;

    const breakdown = breakdownFromDb
      ? {
          ...breakdownFromDb,
          declaredValue: Number(breakdownFromDb?.declaredValue ?? declaredValue) || 0,
          rates: { ...rates, ...(breakdownFromDb?.rates || {}) },
        }
      : { declaredValue, rates };

    const senderCountry = cleanStr(s?.senderCountry || s?.senderCountryName || s?.senderCountryCode) || null;
    const receiverCountry =
      cleanStr(s?.receiverCountry || s?.receiverCountryName || s?.destinationCountryCode) || null;

    const fromFull = joinNice([s?.senderCity, s?.senderState, senderCountry]) || cleanStr(s?.origin) || "—";
    const toFull = joinNice([s?.receiverCity, s?.receiverState, receiverCountry]) || cleanStr(s?.destination) || "—";

    return NextResponse.json({
      company,

      invoiceNumber,
      status,
      currency,
      total: amount,
      paid,

      dueDate,
      paymentMethod,

      declaredValue,
      breakdown,

      shipment: {
        shipmentId: cleanStr(s?.shipmentId),
        trackingNumber: cleanStr(s?.trackingNumber),

        originFull: fromFull,
        destinationFull: toFull,

        status: cleanStr(s?.status) || "—",

        shipmentType: s?.shipmentType || s?.packageType || null,
        serviceLevel: s?.serviceLevel || s?.serviceType || s?.speed || null,
        weightKg: s?.weightKg ?? s?.weight ?? null,
        dimensionsCm: s?.dimensionsCm ?? s?.dimensions ?? null,
      },

      dates: {
        createdAt: s?.createdAt || null,
        updatedAt: s?.updatedAt || null,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}