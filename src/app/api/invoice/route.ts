import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { DEFAULT_PRICING } from "@/lib/pricing";

const escapeRegex = (input: string) =>
  input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const ciExact = (field: string, value: string) => ({
  [field]: { $regex: `^${escapeRegex(value)}$`, $options: "i" },
});

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

    const inv = (shipment as any)?.invoice || {};
    const amount = Number(inv?.amount ?? 0);
    const currency = String(inv?.currency || "USD").toUpperCase();
    const paid = Boolean(inv?.paid);

    // Declared value (robust fallback)
    const declaredValue =
      Number((shipment as any)?.declaredValue ?? (shipment as any)?.packageValue ?? inv?.breakdown?.declaredValue ?? 0) || 0;

    // Stored breakdown from shipment.invoice.breakdown
    const breakdownFromDb = inv?.breakdown ?? null;

    // Load pricing settings so we can show rates as percentages
    const pricingDoc = await db.collection("pricing_settings").findOne({ _id: "default" });
    const pricing = (pricingDoc as any)?.settings || DEFAULT_PRICING;

    // Normalize rates in one place for the UI
    const rates = {
      shipping: pricing?.shippingRate ?? pricing?.shipping ?? null,
      insurance: pricing?.insuranceRate ?? pricing?.insurance ?? null,
      fuel: pricing?.fuelRate ?? pricing?.fuel ?? null,
      customs: pricing?.customsRate ?? pricing?.customs ?? null,
      tax: pricing?.taxRate ?? pricing?.tax ?? null,
      discount: pricing?.discountRate ?? pricing?.discount ?? null,
    };

    // Final breakdown we return (keep everything, but ensure rates + declaredValue exist)
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

    // Invoice number style
    const cleanShipId = String((shipment as any)?.shipmentId || "SHIP").replace(/[^A-Z0-9-]/gi, "");
    const invoiceNumber = `INV-${cleanShipId}`;

    const senderEmail = String((shipment as any)?.senderEmail || "").trim() || "";
    const receiverEmail =
      String((shipment as any)?.receiverEmail || "").trim() ||
      String((shipment as any)?.createdByEmail || "").trim() ||
      "";

    return NextResponse.json({
      invoiceNumber,
      status: paid ? "paid" : "pending",
      currency,
      total: amount,
      paid,
      paidAt: inv?.paidAt || null,

      // ✅ now always present
      declaredValue,
      breakdown,

      shipment: {
        shipmentId: (shipment as any)?.shipmentId || "",
        trackingNumber: (shipment as any)?.trackingNumber || "",
        origin: (shipment as any)?.senderCountryCode || "—",
        destination: (shipment as any)?.destinationCountryCode || "—",
        status: (shipment as any)?.status || "—",
      },

      parties: {
        senderName: (shipment as any)?.senderName || "Sender",
        receiverName: (shipment as any)?.receiverName || "Receiver",
        senderEmail,
        receiverEmail,
      },

      dates: {
        createdAt: (shipment as any)?.createdAt || null,
        updatedAt: (shipment as any)?.updatedAt || null,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}