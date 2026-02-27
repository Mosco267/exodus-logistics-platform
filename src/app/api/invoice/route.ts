import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { DEFAULT_PRICING } from "@/lib/pricing";

const escapeRegex = (input: string) =>
  input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const ciExact = (field: string, value: string) => ({
  [field]: { $regex: `^${escapeRegex(value)}$`, $options: "i" },
});

type PricingSettingsDoc = {
  _id: string; // ✅ we store string _id like "default"
  settings: any;
};

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const q = String(url.searchParams.get("q") || "").trim();

    if (!q) {
      return NextResponse.json({ error: "q is required" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    const shipment = await db.collection("shipments").findOne(
      { $or: [ciExact("trackingNumber", q), ciExact("shipmentId", q)] },
      { projection: { _id: 0 } }
    );

    if (!shipment) {
      return NextResponse.json({ error: "Shipment not found" }, { status: 404 });
    }

    const s: any = shipment;
    const inv = s?.invoice || {};

    const amount = Number(inv?.amount ?? 0);
    const currency = String(inv?.currency || "USD").toUpperCase();
    const paid = Boolean(inv?.paid);

    // ✅ Declared value (robust fallback)
    const declaredValueRaw =
      s?.declaredValue ?? s?.packageValue ?? inv?.breakdown?.declaredValue ?? 0;
    const declaredValue = Number(declaredValueRaw) || 0;

    // ✅ Stored breakdown from DB (if you saved it during shipment creation)
    const breakdownFromDb = inv?.breakdown ?? null;

    // ✅ Load pricing settings so we can show correct percentages in UI
    const pricingDoc = await db
      .collection<PricingSettingsDoc>("pricing_settings")
      .findOne({ _id: "default" });

    const pricing = (pricingDoc as any)?.settings || DEFAULT_PRICING;

    // ✅ IMPORTANT:
    // Return rates using the SAME keys UI expects: shippingRate, insuranceRate, ...
    // Also keep old keys (shipping, insurance...) as fallback.
    const rates = {
      shippingRate: pricing?.shippingRate ?? pricing?.shipping ?? null,
      insuranceRate: pricing?.insuranceRate ?? pricing?.insurance ?? null,
      fuelRate: pricing?.fuelRate ?? pricing?.fuel ?? null,
      customsRate: pricing?.customsRate ?? pricing?.customs ?? null,
      taxRate: pricing?.taxRate ?? pricing?.tax ?? null,
      discountRate: pricing?.discountRate ?? pricing?.discount ?? null,

      // optional backwards-compat keys
      shipping: pricing?.shippingRate ?? pricing?.shipping ?? null,
      insurance: pricing?.insuranceRate ?? pricing?.insurance ?? null,
      fuel: pricing?.fuelRate ?? pricing?.fuel ?? null,
      customs: pricing?.customsRate ?? pricing?.customs ?? null,
      tax: pricing?.taxRate ?? pricing?.tax ?? null,
      discount: pricing?.discountRate ?? pricing?.discount ?? null,
    };

    // ✅ Final breakdown returned
    const breakdown =
      breakdownFromDb
        ? {
            ...breakdownFromDb,
            declaredValue: Number(breakdownFromDb?.declaredValue ?? declaredValue) || 0,
            rates: { ...(breakdownFromDb?.rates || {}), ...rates },
          }
        : {
            declaredValue,
            rates,
          };

    // ✅ Invoice number style
    const cleanShipId = String(s?.shipmentId || "SHIP").replace(/[^A-Z0-9-]/gi, "");
    const invoiceNumber = `INV-${cleanShipId}`;

    const senderEmail = String(s?.senderEmail || "").trim() || "";
    const receiverEmail =
      String(s?.receiverEmail || "").trim() ||
      String(s?.createdByEmail || "").trim() ||
      "";

    // ✅ Advanced route/details (return only if they exist in DB)
    // You can name these however you like in the shipment creation later — just keep them consistent.
    const senderCountry =
      String(s?.senderCountry || s?.senderCountryName || s?.senderCountryCode || "").trim() || null;

    const receiverCountry =
      String(s?.receiverCountry || s?.receiverCountryName || s?.destinationCountryCode || "").trim() || null;

    return NextResponse.json({
      invoiceNumber,
      status: paid ? "paid" : "pending",
      currency,
      total: amount,
      paid,
      paidAt: inv?.paidAt || null,

      declaredValue,
      declaredValueCurrency: String(s?.declaredValueCurrency || currency).toUpperCase(),

      breakdown,

      shipment: {
        shipmentId: s?.shipmentId || "",
        trackingNumber: s?.trackingNumber || "",

        // basic codes
        origin: s?.senderCountryCode || "—",
        destination: s?.destinationCountryCode || "—",

        status: s?.status || "—",

        // ✅ advanced shipment fields (optional)
        shipmentType: s?.shipmentType || s?.packageType || null,          // e.g. Parcel / Cargo / Documents
        serviceLevel: s?.serviceLevel || s?.serviceType || s?.speed || null, // Express / Standard
        weightKg: s?.weightKg ?? s?.weight ?? null,
        dimensionsCm: s?.dimensionsCm ?? s?.dimensions ?? null, // {length,width,height}

        // ✅ advanced sender/receiver address fields (optional)
        senderCountry,
        senderState: s?.senderState || null,
        senderCity: s?.senderCity || null,
        senderAddress: s?.senderAddress || null,

        receiverCountry,
        receiverState: s?.receiverState || null,
        receiverCity: s?.receiverCity || null,
        receiverAddress: s?.receiverAddress || null,
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