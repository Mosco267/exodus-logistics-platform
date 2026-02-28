import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

function escapeRegex(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function ciExact(field: string, value: string) {
  return { [field]: { $regex: `^${escapeRegex(value)}$`, $options: "i" } };
}

function cleanStr(v: any) {
  const s = String(v ?? "").trim();
  return s || "";
}

function cleanNum(v: any, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function locFromShipment(s: any) {
  // ✅ NO address — only state, city, county, country
  return {
    country: cleanStr(s?.receiverCountry || s?.destinationCountryCode),
    state: cleanStr(s?.receiverState),
    city: cleanStr(s?.receiverCity),
    county: cleanStr(s?.receiverCounty), // optional if you add it later
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const q = String(body?.trackingNumber || body?.q || "").trim();

    if (!q) {
      return NextResponse.json(
        { error: "Tracking number or shipmentId is required" },
        { status: 400 }
      );
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

    // ✅ invoice summary
    const invoice = s?.invoice
      ? {
          paid: Boolean(s.invoice?.paid),
          amount: cleanNum(s.invoice?.amount ?? 0),
          currency:
            cleanStr(s.invoice?.currency || s?.declaredValueCurrency || "USD") || "USD",
        }
      : null;

    const destination = [s?.receiverCity, s?.receiverState, s?.receiverCountry]
      .map((x: any) => String(x || "").trim())
      .filter(Boolean)
      .join(", ");

    const origin = [s?.senderCity, s?.senderState, s?.senderCountry]
      .map((x: any) => String(x || "").trim())
      .filter(Boolean)
      .join(", ");

    // ✅ prefer real timeline events from DB
    let events = Array.isArray(s?.trackingEvents) ? [...s.trackingEvents] : [];

    // sort by occurredAt (oldest -> newest)
    events.sort((a: any, b: any) => {
      const ta = new Date(a?.occurredAt || 0).getTime();
      const tb = new Date(b?.occurredAt || 0).getTime();
      return ta - tb;
    });

    // ✅ fallback: if no events yet, create a single “Created/current status” event
    if (events.length === 0) {
      const occurredAt =
        s?.statusUpdatedAt || s?.createdAt || new Date().toISOString();

      events = [
        {
          key: "created",
          label: cleanStr(s?.status || "Created") || "Created",
          note: cleanStr(s?.statusNote || ""),
          occurredAt,
          color: "green", // ✅ default color for Created
          location: locFromShipment(s),
          meta: {
            invoicePaid: Boolean(s?.invoice?.paid),
            invoiceAmount: cleanNum(s?.invoice?.amount ?? 0),
            currency: cleanStr(s?.invoice?.currency || "USD") || "USD",
            destination,
            origin,
          },
        },
      ];
    } else {
      // ensure each event has safe fields + meta basics (optional, safe)
      events = events.map((ev: any) => ({
        ...ev,

        // ✅ keep/normalize these
        key: cleanStr(ev?.key || ""),
        label: cleanStr(ev?.label || "Update") || "Update",
        note: cleanStr(ev?.note || ""),
        occurredAt: ev?.occurredAt || new Date().toISOString(),

        // ✅ IMPORTANT: return color to UI
        color: cleanStr(ev?.color || ""),

        location: ev?.location || {},

        meta: {
          ...(ev?.meta || {}),
          invoicePaid: ev?.meta?.invoicePaid ?? Boolean(s?.invoice?.paid),
          invoiceAmount: ev?.meta?.invoiceAmount ?? cleanNum(s?.invoice?.amount ?? 0),
          currency:
            (ev?.meta?.currency ?? cleanStr(s?.invoice?.currency || "USD")) || "USD",
          destination: ev?.meta?.destination ?? destination,
          origin: ev?.meta?.origin ?? origin,
        },
      }));
    }

    const last = events[events.length - 1] || null;

    // ✅ estimated delivery (keep your placeholder for now)
    const estimatedDelivery =
      s?.estimatedDelivery ||
      new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toDateString();

    return NextResponse.json({
      shipmentId: cleanStr(s?.shipmentId),
      trackingNumber: cleanStr(s?.trackingNumber),

      currentStatus: cleanStr(s?.status || last?.label || "—"),
      statusNote: cleanStr(s?.statusNote || last?.note || ""),
      nextStep: cleanStr(s?.nextStep || ""),

      createdAt: s?.createdAt || null,
      updatedAt: s?.updatedAt || null,

      origin: origin || null,
      destination: destination || null,

      invoice,

      events,
      estimatedDelivery,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}