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

function normUpper(v: any) {
  return cleanStr(v).toUpperCase();
}

function normKey(v: any) {
  return cleanStr(v).toLowerCase().replace(/[\s_-]+/g, "-");
}

function locLite(loc: any) {
  return {
    country: cleanStr(loc?.country),
    state: cleanStr(loc?.state),
    city: cleanStr(loc?.city),
    county: cleanStr(loc?.county),
  };
}

function locFromShipment(s: any) {
  return {
    country: cleanStr(s?.receiverCountry || s?.destinationCountryCode),
    state: cleanStr(s?.receiverState),
    city: cleanStr(s?.receiverCity),
    county: cleanStr(s?.receiverCounty),
  };
}

function fmtLoc(loc: any) {
  const parts = [loc?.city, loc?.state, loc?.country].map(cleanStr).filter(Boolean);
  return parts.join(", ");
}

// ✅ invoice format: EXS-INV-YYYY-MM-1234567 (fallback for old shipments)
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

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const q = normUpper(body?.trackingNumber || body?.q || "");

    if (!q) {
      return NextResponse.json(
        { error: "Tracking number or shipmentId is required" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    // ✅ allow both trackingNumber OR shipmentId search
    const shipment = await db.collection("shipments").findOne(
      { $or: [ciExact("trackingNumber", q), ciExact("shipmentId", q)] },
      { projection: { _id: 0 } }
    );

    if (!shipment) {
      return NextResponse.json({ error: "Shipment not found" }, { status: 404 });
    }

    const s: any = shipment;

    const invoiceNumber =
      normUpper(s?.invoice?.invoiceNumber) ||
      makeInvoiceNumber(cleanStr(s?.shipmentId), cleanStr(s?.trackingNumber));

    const invoice = s?.invoice
      ? {
          invoiceNumber,
          paid: Boolean(s.invoice?.paid),
          amount: Number(s.invoice?.amount ?? 0),
          currency: cleanStr(s.invoice?.currency || s?.declaredValueCurrency || "USD") || "USD",
        }
      : {
          invoiceNumber,
          paid: false,
          amount: 0,
          currency: cleanStr(s?.declaredValueCurrency || "USD") || "USD",
        };

    const destination = [s?.receiverCity, s?.receiverState, s?.receiverCountry]
      .map(cleanStr)
      .filter(Boolean)
      .join(", ");

    const origin = [s?.senderCity, s?.senderState, s?.senderCountry]
      .map(cleanStr)
      .filter(Boolean)
      .join(", ");

    // timeline
    let raw = Array.isArray(s?.trackingEvents) ? [...s.trackingEvents] : [];

    raw.sort((a: any, b: any) => {
      const ta = new Date(a?.occurredAt || 0).getTime();
      const tb = new Date(b?.occurredAt || 0).getTime();
      return ta - tb;
    });

    if (raw.length === 0) {
      const occurredAt = s?.statusUpdatedAt || s?.createdAt || new Date().toISOString();
      raw = [
        {
          key: "created",
          label: cleanStr(s?.status || "Created") || "Created",
          note: cleanStr(s?.statusNote || ""),
          occurredAt,
          color: "#22c55e",
          location: locFromShipment(s),
        },
      ];
    }

    const entries = raw.map((ev: any) => {
      const label = cleanStr(ev?.label || ev?.status || "Update") || "Update";
      const key = normKey(ev?.key || label || "update");
      const occurredAt = cleanStr(ev?.occurredAt) || new Date().toISOString();

      return {
        key,
        label,
        note: cleanStr(ev?.note || ev?.statusNote || ""),
        occurredAt,
        color: cleanStr(ev?.color),
        location: locLite(ev?.location || {}),
        meta: {
          invoicePaid: Boolean(invoice.paid),
          invoiceAmount: Number(invoice.amount ?? 0),
          currency: cleanStr(invoice.currency || "USD") || "USD",
          destination,
          origin,
        },
      };
    });

    // group stages
    const groups: any[] = [];
    const indexByKey = new Map<string, number>();

    for (const e of entries) {
      const k = e.key || normKey(e.label);
      const idx = indexByKey.get(k);

      if (idx === undefined) {
        indexByKey.set(k, groups.length);
        groups.push({
          key: k,
          label: e.label,
          color: e.color || "",
          occurredAt: e.occurredAt,
          location: e.location,
          entries: [
            {
              occurredAt: e.occurredAt,
              note: e.note,
              color: e.color || "",
              location: e.location,
            },
          ],
          meta: e.meta,
        });
      } else {
        const g = groups[idx];
        g.entries.push({
          occurredAt: e.occurredAt,
          note: e.note,
          color: e.color || "",
          location: e.location,
        });
        g.occurredAt = e.occurredAt;
        g.location = e.location;
        if (e.color) g.color = e.color;
      }
    }

    const lastGroup = groups[groups.length - 1] || null;
    const currentLocation = lastGroup?.location ? fmtLoc(lastGroup.location) : "";

    const estimatedDelivery =
      s?.estimatedDelivery ||
      new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toDateString();

    return NextResponse.json({
      shipmentId: cleanStr(s?.shipmentId),
      trackingNumber: cleanStr(s?.trackingNumber),

      currentStatus: cleanStr(s?.status || lastGroup?.label || "—"),
      statusNote: cleanStr(s?.statusNote || ""),
      nextStep: cleanStr(s?.nextStep || ""),

      createdAt: s?.createdAt || null,
      updatedAt: s?.updatedAt || null,

      origin: origin || null,
      destination: destination || null,
      currentLocation: currentLocation || null,

      invoice, // ✅ includes invoiceNumber

      events: groups,
      estimatedDelivery,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}