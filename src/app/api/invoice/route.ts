import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { DEFAULT_PRICING } from "@/lib/pricing";

const escapeRegex = (input: string) =>
  input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const ciExact = (field: string, value: string) => ({
  [field]: { $regex: `^${escapeRegex(value)}$`, $options: "i" },
});

type PricingSettingsDoc = {
  _id: string;
  settings: any;
};

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

function joinNice(parts: Array<any>) {
  return parts
    .map((x) => String(x || "").trim())
    .filter(Boolean)
    .join(", ");
}

function computeInvoiceStatus(paid: boolean, dueDate?: string | null) {
  if (paid) return "paid" as const;
  if (!dueDate) return "pending" as const;

  const d = new Date(dueDate);
  if (Number.isNaN(d.getTime())) return "pending" as const;

  const now = Date.now();
  return now > d.getTime() ? ("overdue" as const) : ("pending" as const);
}

// legacy invoice number style (until you store real invoiceNumber in DB)
function legacyInvoiceNumberFromShipmentId(shipmentId: string) {
  const cleanShipId = String(shipmentId || "SHIP").replace(/[^A-Z0-9-]/gi, "");
  return `INV-${cleanShipId}`;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);

    // ✅ New secure flow:
    // /api/invoice?invoice=EXL-INV-123456&email=someone@mail.com
    const invoiceParam = cleanStr(url.searchParams.get("invoice"));
    const emailParam = cleanStr(url.searchParams.get("email")).toLowerCase();

    // ✅ Old fallback flow:
    // /api/invoice?q=TRACKING_OR_SHIPMENT
    const q = cleanStr(url.searchParams.get("q"));

    if (!invoiceParam && !q) {
      return NextResponse.json(
        { error: "Provide invoice+email or q." },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    // ✅ Load company settings (DB first, fallback to env/defaults)
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

    // ✅ pricing settings for rate display
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

    // -------------------------------------------------------
    // 1) Find shipment (NEW secure invoice+email flow)
    // -------------------------------------------------------
    let shipment: any | null = null;
    let invoiceNumber = "";
    let dueDate: string | null = null;
    let paymentMethod: string | null = null;

    if (invoiceParam) {
      if (!emailParam) {
        return NextResponse.json(
          { error: "email is required when using invoice." },
          { status: 400 }
        );
      }

      const invoiceNumberUpper = invoiceParam.toUpperCase();

      // ✅ Try invoices collection first (recommended future-proof)
      const invDoc = await db.collection("invoices").findOne(
        {
          invoiceNumber: invoiceNumberUpper,
          $or: [
            ciExact("parties.senderEmail", emailParam),
            ciExact("parties.receiverEmail", emailParam),
          ],
        },
        { projection: { _id: 0 } }
      );

      if (invDoc) {
        invoiceNumber = invoiceNumberUpper;
        dueDate = (invDoc as any)?.dueDate || null;
        paymentMethod = (invDoc as any)?.paymentMethod || null;

        // If invoice doc stores shipmentId, use it
        const invShipmentId = cleanStr((invDoc as any)?.shipmentId);
        if (invShipmentId) {
          shipment = await db.collection("shipments").findOne(
            ciExact("shipmentId", invShipmentId),
            { projection: { _id: 0 } }
          );
        }
      }

      // ✅ Fallback: if no invoices collection yet, match legacy INV-{shipmentId}
      if (!shipment) {
        const maybeShipmentId =
          invoiceNumberUpper.startsWith("INV-")
            ? invoiceNumberUpper.slice(4)
            : "";

        if (maybeShipmentId) {
          const s = await db.collection("shipments").findOne(
            ciExact("shipmentId", maybeShipmentId),
            { projection: { _id: 0 } }
          );

          if (s) {
            const senderEmail = cleanStr((s as any)?.senderEmail).toLowerCase();
            const receiverEmail = cleanStr((s as any)?.receiverEmail).toLowerCase();
            const createdByEmail = cleanStr((s as any)?.createdByEmail).toLowerCase();

            const ok =
              emailParam === senderEmail ||
              emailParam === receiverEmail ||
              emailParam === createdByEmail;

            if (!ok) {
              return NextResponse.json(
                { error: "Invoice/email mismatch." },
                { status: 403 }
              );
            }

            shipment = s;
            invoiceNumber = invoiceNumberUpper;
          }
        }
      }

      if (!shipment) {
        return NextResponse.json(
          { error: "Invoice not found (or email mismatch)." },
          { status: 404 }
        );
      }
    }

    // -------------------------------------------------------
    // 2) Old flow: find shipment by q (tracking/shipment)
    // -------------------------------------------------------
    if (!shipment && q) {
      shipment = await db.collection("shipments").findOne(
        { $or: [ciExact("trackingNumber", q), ciExact("shipmentId", q)] },
        { projection: { _id: 0 } }
      );

      if (!shipment) {
        return NextResponse.json({ error: "Shipment not found" }, { status: 404 });
      }

      invoiceNumber = legacyInvoiceNumberFromShipmentId(cleanStr(shipment?.shipmentId));
    }

    const s: any = shipment;
    const inv = s?.invoice || {};
    // ✅ Pull dueDate + paymentMethod from shipment.invoice (your current DB structure)
if (!dueDate) dueDate = inv?.dueDate ? String(inv.dueDate) : null;
if (!paymentMethod) paymentMethod = inv?.paymentMethod ? String(inv.paymentMethod) : null;

    const amount = Number(inv?.amount ?? 0);
    const currency = String(inv?.currency || "USD").toUpperCase();
    const paid = Boolean(inv?.paid);

    // declared value fallback
    const declaredValueRaw =
      s?.declaredValue ?? s?.packageValue ?? inv?.breakdown?.declaredValue ?? 0;
    const declaredValue = Number(declaredValueRaw) || 0;

    const breakdownFromDb = inv?.breakdown ?? null;

    const breakdown =
      breakdownFromDb
        ? {
            ...breakdownFromDb,
            declaredValue:
              Number(breakdownFromDb?.declaredValue ?? declaredValue) || 0,
            rates: { ...rates, ...(breakdownFromDb?.rates || {}) },
          }
        : {
            declaredValue,
            rates,
          };

    const senderEmail = cleanStr(s?.senderEmail);
    const receiverEmail =
      cleanStr(s?.receiverEmail) || cleanStr(s?.createdByEmail);

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

    const status = computeInvoiceStatus(paid, dueDate);

    return NextResponse.json({
      company, // ✅ used by invoice full page for address/phone/email

      invoiceNumber,
      status, // "paid" | "pending" | "overdue"
      currency,
      total: amount,
      paid,
      paidAt: inv?.paidAt || null,

      dueDate: dueDate || null,
      paymentMethod: paymentMethod || null,

      declaredValue,
      declaredValueCurrency: String(s?.declaredValueCurrency || currency).toUpperCase(),

      breakdown,

      shipment: {
        shipmentId: cleanStr(s?.shipmentId),
        trackingNumber: cleanStr(s?.trackingNumber),

        origin: cleanStr(s?.senderCountryCode) || "—",
        destination: cleanStr(s?.destinationCountryCode) || "—",

        originFull: fromFull,
        destinationFull: toFull,

        status: cleanStr(s?.status) || "—",

        shipmentType: s?.shipmentType || s?.packageType || null,
        serviceLevel: s?.serviceLevel || s?.serviceType || s?.speed || null,
        weightKg: s?.weightKg ?? s?.weight ?? null,
        dimensionsCm: s?.dimensionsCm ?? s?.dimensions ?? null,

        senderCountry,
        senderState: s?.senderState || null,
        senderCity: s?.senderCity || null,
        senderAddress: s?.senderAddress || null,
        senderPostalCode: s?.senderPostalCode || null,

        receiverCountry,
        receiverState: s?.receiverState || null,
        receiverCity: s?.receiverCity || null,
        receiverAddress: s?.receiverAddress || null,
        receiverPostalCode: s?.receiverPostalCode || null,
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
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}