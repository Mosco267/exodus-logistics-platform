import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { DEFAULT_PRICING } from "@/lib/pricing";

const escapeRegex = (input: string) =>
  input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

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

// ✅ invoice format: EXS-INV-YYYY-MM-1234567
function makeInvoiceNumber(seedA: string, seedB: string) {
  const now = new Date();
  const yyyy = String(now.getFullYear());
  const mm = String(now.getMonth() + 1).padStart(2, "0");

  const seed = `${seedA}::${seedB}`;
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const seven = String((h % 9000000) + 1000000); // 7 digits

  return `EXS-INV-${yyyy}-${mm}-${seven}`;
}

function computeInvoiceStatus(paid: boolean, dueDate?: string | null) {
  if (paid) return "paid" as const;
  if (!dueDate) return "pending" as const;

  const d = new Date(dueDate);
  if (Number.isNaN(d.getTime())) return "pending" as const;
  return Date.now() > d.getTime() ? ("overdue" as const) : ("pending" as const);
}

async function handleInvoice(req: Request, source: "GET" | "POST") {
  const url = new URL(req.url);

  // ✅ GET query params
  let q = cleanStr(url.searchParams.get("q"));
  let invoiceParam = cleanStr(url.searchParams.get("invoice"));
  let emailParam = cleanStr(url.searchParams.get("email")).toLowerCase();

  // ✅ POST body (optional)
  if (source === "POST") {
    const body = await req.json().catch(() => ({} as any));
    q = q || cleanStr(body?.q);
    invoiceParam = invoiceParam || cleanStr(body?.invoice);
    emailParam = emailParam || cleanStr(body?.email).toLowerCase();
  }

  if (!q && !invoiceParam) {
    return NextResponse.json(
      { error: "Provide q OR invoice (+ email)." },
      { status: 400 }
    );
  }

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB);

  // ✅ Company settings
  const companyDoc = await db
    .collection<CompanySettingsDoc>("company_settings")
    .findOne({ _id: "default" });

  const company = {
    name: companyDoc?.name || "Exodus Logistics Ltd.",
    address:
      companyDoc?.address || "1199 E Calaveras Blvd, California, USA 90201",
    phone: companyDoc?.phone || "+1 (516) 243-7836",
    email: companyDoc?.email || "support@goexoduslogistics.com",
    registrationNumber: companyDoc?.registrationNumber || "",
  };

  // ✅ Pricing settings
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

    // backwards compat
    shipping: pricing?.shippingRate ?? pricing?.shipping ?? null,
    insurance: pricing?.insuranceRate ?? pricing?.insurance ?? null,
    fuel: pricing?.fuelRate ?? pricing?.fuel ?? null,
    customs: pricing?.customsRate ?? pricing?.customs ?? null,
    tax: pricing?.taxRate ?? pricing?.tax ?? null,
    discount: pricing?.discountRate ?? pricing?.discount ?? null,
  };

  let shipment: any | null = null;

  // ----------------------------
  // ✅ Secure: invoice + email
  // ----------------------------
  if (invoiceParam) {
    if (!emailParam) {
      return NextResponse.json(
        { error: "email is required when using invoice." },
        { status: 400 }
      );
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

    const ok =
      emailParam === senderEmail ||
      emailParam === receiverEmail ||
      emailParam === createdByEmail;

    if (!ok) {
      return NextResponse.json({ error: "Invoice/email mismatch." }, { status: 403 });
    }
  }

  // ----------------------------
  // ✅ Simple: q = tracking/shipment
  // ----------------------------
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
    normUpper(inv?.invoiceNumber) ||
    makeInvoiceNumber(cleanStr(s?.shipmentId), cleanStr(s?.trackingNumber));

  const amount = Number(inv?.amount ?? 0);
  const currency = normUpper(inv?.currency || "USD") || "USD";
  const paid = Boolean(inv?.paid);
  const dueDate = inv?.dueDate ? String(inv.dueDate) : null;

  // ✅ IMPORTANT: paymentMethod should be NULL unless admin sets it
  const paymentMethod = cleanStr(inv?.paymentMethod) || null;

  // ✅ Allow admin override: invoice.status = "cancelled" | "overdue" | "pending" | "paid"
  const statusOverride = cleanStr(inv?.status).toLowerCase();
  const computedStatus = computeInvoiceStatus(paid, dueDate);
  const status =
    statusOverride && ["paid", "pending", "overdue", "cancelled"].includes(statusOverride)
      ? (statusOverride as any)
      : computedStatus;

  const declaredValueRaw =
    s?.declaredValue ?? s?.packageValue ?? inv?.breakdown?.declaredValue ?? 0;
  const declaredValue = Number(declaredValueRaw) || 0;

  const breakdownFromDb = inv?.breakdown ?? null;
  const breakdown =
    breakdownFromDb
      ? {
          ...breakdownFromDb,
          declaredValue: Number(breakdownFromDb?.declaredValue ?? declaredValue) || 0,
          rates: { ...rates, ...(breakdownFromDb?.rates || {}) },
        }
      : { declaredValue, rates };

  const senderEmail = cleanStr(s?.senderEmail);
  const receiverEmail = cleanStr(s?.receiverEmail) || cleanStr(s?.createdByEmail);

  const senderCountry =
    cleanStr(s?.senderCountry || s?.senderCountryName || s?.senderCountryCode) || null;
  const receiverCountry =
    cleanStr(s?.receiverCountry || s?.receiverCountryName || s?.destinationCountryCode) || null;

  const originFull =
    joinNice([s?.senderCity, s?.senderState, senderCountry]) || cleanStr(s?.origin) || "—";
  const destinationFull =
    joinNice([s?.receiverCity, s?.receiverState, receiverCountry]) ||
    cleanStr(s?.destination) ||
    "—";

  return NextResponse.json({
    company,

    invoiceNumber,
    status, // paid | pending | overdue | cancelled
    currency,
    total: amount,
    paid,
    paidAt: inv?.paidAt || null,

    dueDate,
    paymentMethod,

    declaredValue,
    declaredValueCurrency: normUpper(s?.declaredValueCurrency || currency) || currency,

    breakdown,

    shipment: {
      shipmentId: cleanStr(s?.shipmentId),
      trackingNumber: cleanStr(s?.trackingNumber),

      originFull,
      destinationFull,

      status: cleanStr(s?.status) || "—",
      shipmentType: s?.shipmentType || s?.packageType || null,
      serviceLevel: s?.serviceLevel || s?.serviceType || s?.speed || null,
      weightKg: s?.weightKg ?? s?.weight ?? null,
      dimensionsCm: s?.dimensionsCm ?? s?.dimensions ?? null,

      senderCountry,
      senderState: s?.senderState || null,
      senderCity: s?.senderCity || null,

      receiverCountry,
      receiverState: s?.receiverState || null,
      receiverCity: s?.receiverCity || null,
    },

    parties: {
      senderName: s?.senderName || "Sender",
      receiverName: s?.receiverName || "Receiver",
      senderEmail,
      receiverEmail,
    },

    dates: {
      createdAt: s?.createdAt || null,
      updatedAt: s?.updatedAt || null,
    },
  });
}

export async function GET(req: Request) {
  try {
    return await handleInvoice(req, "GET");
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    return await handleInvoice(req, "POST");
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}