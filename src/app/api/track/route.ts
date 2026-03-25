import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { details } from "framer-motion/client";

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
      return NextResponse.json({ error: "Tracking number is required" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    const shipment = await db.collection("shipments").findOne(
      ciExact("trackingNumber", q),
      { projection: { _id: 0 } }
    );

    if (!shipment) {
      return NextResponse.json({ error: "Shipment not found" }, { status: 404 });
    }

    const s: any = shipment;

    // Load statuses for icon matching
    const statusesList = await db.collection("statuses").find({}).toArray();
    const statusByKey = new Map<string, any>();
    const statusByLabel = new Map<string, any>();
    for (const st of statusesList) {
      if (st.key) statusByKey.set(String(st.key).toLowerCase(), st);
      if (st.label) statusByLabel.set(String(st.label).toLowerCase(), st);
    }

    const invoiceNumber =
      normUpper(s?.invoice?.invoiceNumber) ||
      makeInvoiceNumber(cleanStr(s?.shipmentId), cleanStr(s?.trackingNumber));

    const rawInvoiceStatus = cleanStr(s?.invoice?.status).toLowerCase();
    const invoiceStatus =
      rawInvoiceStatus === "paid" ? "paid"
      : rawInvoiceStatus === "overdue" ? "overdue"
      : rawInvoiceStatus === "cancelled" || rawInvoiceStatus === "canceled" ? "cancelled"
      : "unpaid";

    const invoice = s?.invoice
      ? {
          invoiceNumber,
          paid: invoiceStatus === "paid",
          status: invoiceStatus,
          amount: Number(s.invoice?.amount ?? 0),
          currency: cleanStr(s.invoice?.currency || s?.declaredValueCurrency || "USD") || "USD",
        }
      : {
          invoiceNumber,
          paid: false,
          status: "unpaid",
          amount: 0,
          currency: cleanStr(s?.declaredValueCurrency || "USD") || "USD",
        };

    const destination = [s?.receiverCity, s?.receiverState, s?.receiverCountry]
      .map(cleanStr).filter(Boolean).join(", ");

    const origin = [s?.senderCity, s?.senderState, s?.senderCountry]
      .map(cleanStr).filter(Boolean).join(", ");

    let raw = Array.isArray(s?.trackingEvents) ? [...s.trackingEvents] : [];

    raw.sort((a: any, b: any) =>
      new Date(a?.occurredAt || 0).getTime() - new Date(b?.occurredAt || 0).getTime()
    );

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

      const matchedStatus =
        statusByKey.get(key) ||
        statusByKey.get(key.replace(/-/g, "")) ||
        statusByLabel.get(label.toLowerCase()) ||
        null;

      return {
        key,
        label,
        // note field: details takes priority over note for display
        note: cleanStr(ev?.note || ev?.statusNote || ""),
        details: cleanStr(ev?.details || ""),
        occurredAt,
        color: cleanStr(ev?.color),
        detailColor: cleanStr(ev?.detailColor),
        icon: cleanStr(matchedStatus?.icon || ev?.icon || ""),
        location: locLite(ev?.location || {}),
        // Fix 4 — also pass currentLocation string if stored
        currentLocation: cleanStr(ev?.currentLocation || ""),
        meta: {
          invoicePaid: Boolean(invoice.paid),
          invoiceAmount: Number(invoice.amount ?? 0),
          currency: cleanStr(invoice.currency || "USD") || "USD",
          destination,
          origin,
        },
      };
    });

    // Group by key (stage)
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
          icon: e.icon || "",
          occurredAt: e.occurredAt,
          location: e.location,
          entries: [
            {
              occurredAt: e.occurredAt,
              note: e.note,
              details: e.details,
              color: e.color || "",
              detailColor: e.detailColor || "",
              location: e.location,
              currentLocation: e.currentLocation || "",
            },
          ],
          meta: e.meta,
        });
      } else {
        const g = groups[idx];
        g.entries.push({
          occurredAt: e.occurredAt,
          note: e.note,
          details: e.details,
          color: e.color || "",
          detailColor: e.detailColor || "",
          location: e.location,
          currentLocation: e.currentLocation || "",
        });
        // Update occurredAt to latest but keep first location on the group
        g.occurredAt = e.occurredAt;
g.location = e.location; // Fix 2 — always use LAST entry's location for stage header
if (e.color) g.color = e.color;
        if (e.icon && !g.icon) g.icon = e.icon;
      }
    }

    const lastGroup = groups[groups.length - 1] || null;

    // Fix 4 — currentLocation and statusNote come from the LAST ENTRY of the last group
    // not from the group header itself
    const lastGroupEntries = lastGroup?.entries || [];
    const lastEntry = lastGroupEntries[lastGroupEntries.length - 1] || null;

    // currentLocation: prefer stored currentLocation string, fall back to formatted location
    const currentLocation = cleanStr(lastEntry?.currentLocation) || fmtLoc(lastEntry?.location) || fmtLoc(lastGroup?.location) || "";

    // statusNote for the track page: last entry's note
    const lastEntryNote = cleanStr(lastEntry?.note || "");

    const estimatedDelivery = s?.estimatedDeliveryDate || s?.estimatedDelivery || null;

    return NextResponse.json({
      shipmentId: cleanStr(s?.shipmentId),
      trackingNumber: cleanStr(s?.trackingNumber),

      currentStatus: cleanStr(s?.status || lastGroup?.label || "—"),
      // Fix 4 — statusNote from last entry, not from shipment-level field
      statusNote: lastEntryNote || cleanStr(s?.statusNote || ""),
      nextStep: cleanStr(s?.nextStep || ""),

      createdAt: s?.createdAt || null,
      updatedAt: s?.updatedAt || null,

      origin: origin || null,
      destination: destination || null,
      // Fix 4 — currentLocation from last entry
      currentLocation: currentLocation || null,
      packageDescription: cleanStr(s?.packageDescription || null),

      invoice,
      events: groups,
      estimatedDelivery,
      shipmentMeans: cleanStr(s?.shipmentMeans) || null,
      shipmentScope: cleanStr(s?.shipmentScope) || "international",
      serviceLevel: cleanStr(s?.serviceLevel) || null,
      shipmentType: cleanStr(s?.shipmentType) || null,
      weightKg: s?.weightKg ?? null,
      dimensionsCm: s?.dimensionsCm || null,
      carrierName: "Exodus Logistics",
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}