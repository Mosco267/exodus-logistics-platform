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
  _id: string;
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

type InvoiceStatus = "paid" | "unpaid" | "overdue" | "cancelled";

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

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);

    const q = cleanStr(url.searchParams.get("q"));
    const invoiceParam = cleanStr(url.searchParams.get("invoice"));
    const emailParam = cleanStr(url.searchParams.get("email")).toLowerCase();

    if (!q && !invoiceParam) {
      return NextResponse.json(
        { error: "Provide q OR invoice (+ email)." },
        { status: 400 }
      );
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

    const companyDoc = await db
      .collection<CompanySettingsDoc>("company_settings")
      .findOne({ _id: "default" });

    const company = {
      name: companyDoc?.name || "Exodus Logistics Ltd.",
      address:
        companyDoc?.address ||
        "1199 E Calaveras Blvd, California, USA 90201",
      phone: companyDoc?.phone || "+1 (516) 243-7836",
      email: companyDoc?.email || "support@goexoduslogistics.com",
      registrationNumber: companyDoc?.registrationNumber || "",
    };

    const pricingDoc = await db
      .collection<PricingSettingsDoc>("pricing_settings")
      .findOne({ _id: "default" });

    const pricingDefaults = (pricingDoc as any)?.settings || DEFAULT_PRICING;

    let shipment: any | null = null;

    if (invoiceParam) {
      if (!emailParam) {
        return NextResponse.json(
          { error: "email is required when using invoice." },
          { status: 400 }
        );
      }

      const invUpper = normUpper(invoiceParam);

      shipment = await db.collection("shipments").findOne(
        {
          $or: [
            ciExact("invoice.invoiceNumber", invUpper),
            ciExact("invoiceNumber", invUpper),
            ciExact("invoice.invoiceNo", invUpper),
            ciExact("invoice.invoice_number", invUpper),
          ],
        },
        { projection: { _id: 0 } }
      );

      if (!shipment) {
        shipment = await db.collection("shipments").findOne(
          {
            $or: [ciExact("trackingNumber", invUpper), ciExact("shipmentId", invUpper)],
          },
          { projection: { _id: 0 } }
        );
      }

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

    if (!inv?.invoiceNumber) {
      await db.collection("shipments").updateOne(
        { shipmentId: s?.shipmentId },
        { $set: { "invoice.invoiceNumber": invoiceNumber } }
      );
    }

    const currency = normUpper(inv?.currency || "USD") || "USD";
    const paid = Boolean(inv?.paid);
    const dueDate = inv?.dueDate ? String(inv.dueDate) : null;

    const computedStatus = computeInvoiceStatus(paid, dueDate);
    const explicitStatus = normalizeInvoiceStatus(inv?.status || inv?.invoiceStatus);

    let status: InvoiceStatus =
      explicitStatus === "cancelled" ? "cancelled" : computedStatus;

    if (explicitStatus === "paid") status = "paid";
    if (explicitStatus === "overdue") status = "overdue";
    if (explicitStatus === "unpaid") status = computedStatus === "overdue" ? "overdue" : "unpaid";

    if (
      status !== cleanStr(inv?.status).toLowerCase() &&
      status !== "cancelled"
    ) {
      await db.collection("shipments").updateOne(
        { shipmentId: s?.shipmentId },
        {
          $set: {
            "invoice.status": status,
            updatedAt: new Date(),
          },
        }
      );
    }

    const paymentMethod = cleanStr(inv?.paymentMethod) || null;

    const declaredValueRaw =
      s?.declaredValue ?? s?.packageValue ?? inv?.breakdown?.declaredValue ?? 0;
    const declaredValue = Number(declaredValueRaw) || 0;

    const pricingUsed = inv?.pricingUsed
      ? { ...pricingDefaults, ...inv.pricingUsed }
      : { ...pricingDefaults };

    const breakdown = inv?.breakdown
      ? { ...inv.breakdown, declaredValue: Number(inv?.breakdown?.declaredValue ?? declaredValue) || 0 }
      : {
          declaredValue,
          pricingUsed,
        };

    const amount = Number(inv?.amount ?? breakdown?.total ?? 0) || 0;

    const senderCountry =
      cleanStr(s?.senderCountry || s?.senderCountryName || s?.senderCountryCode) || null;
    const receiverCountry =
      cleanStr(s?.receiverCountry || s?.receiverCountryName || s?.destinationCountryCode) || null;

    const fromFull =
      joinNice([s?.senderCity, s?.senderState, senderCountry]) ||
      cleanStr(s?.origin) ||
      "—";

    const toFull =
      joinNice([s?.receiverCity, s?.receiverState, receiverCountry]) ||
      cleanStr(s?.destination) ||
      "—";

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
      pricingUsed,

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

      parties: {
        senderName: cleanStr(s?.senderName) || "Sender",
        senderEmail: cleanStr(s?.senderEmail) || cleanStr(s?.createdByEmail) || "",
        receiverName: cleanStr(s?.receiverName) || "Receiver",
        receiverEmail: cleanStr(s?.receiverEmail) || "",
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