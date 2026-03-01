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

function normKey(v: any) {
  return cleanStr(v)
    .toLowerCase()
    .trim()
    .replace(/[\s_-]+/g, "-");
}

function cleanColor(v: any) {
  const s = cleanStr(v);
  // accept "#RRGGBB" or "rgb(...)" or any non-empty string
  return s || "";
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
  const parts = [loc?.city, loc?.state, loc?.country]
    .map((x: any) => cleanStr(x))
    .filter(Boolean);
  return parts.join(", ");
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const q = String(body?.trackingNumber || body?.q || "").trim();

    if (!q) {
      return NextResponse.json(
        { error: "Tracking number is required" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    const shipment = await db.collection("shipments").findOne({
      trackingNumber: q
    })

    if (!shipment) {
      return NextResponse.json({ error: "Shipment not found" }, { status: 404 });
    }

    const s: any = shipment;

    // ✅ invoice summary
    const invoice = s?.invoice
      ? {
          paid: Boolean(s.invoice?.paid),
          amount: Number(s.invoice?.amount ?? 0),
          currency:
            cleanStr(s.invoice?.currency || s?.declaredValueCurrency || "USD") ||
            "USD",
        }
      : null;

    const destination = [s?.receiverCity, s?.receiverState, s?.receiverCountry]
      .map((x: any) => cleanStr(x))
      .filter(Boolean)
      .join(", ");

    const origin = [s?.senderCity, s?.senderState, s?.senderCountry]
      .map((x: any) => cleanStr(x))
      .filter(Boolean)
      .join(", ");

    // ✅ raw timeline from DB (each save in admin adds one entry)
    let raw = Array.isArray(s?.trackingEvents) ? [...s.trackingEvents] : [];

    // sort by occurredAt (oldest -> newest)
    raw.sort((a: any, b: any) => {
      const ta = new Date(a?.occurredAt || 0).getTime();
      const tb = new Date(b?.occurredAt || 0).getTime();
      return ta - tb;
    });

    // ✅ fallback: if no timeline entries exist yet, create a "Created" entry only
    if (raw.length === 0) {
      const occurredAt =
        s?.statusUpdatedAt || s?.createdAt || new Date().toISOString();

      raw = [
        {
          key: "created",
          label: cleanStr(s?.status || "Created") || "Created",
          note: cleanStr(s?.statusNote || ""),
          occurredAt,
          color: "#22c55e", // default green
          location: locFromShipment(s),
        },
      ];
    }

    // ✅ normalize raw entries
    const entries = raw.map((ev: any) => {
      const label = cleanStr(ev?.label || ev?.status || "Update") || "Update";
      const key = normKey(ev?.key || label || "update");
      const occurredAt = cleanStr(ev?.occurredAt) || new Date().toISOString();

      return {
        key,
        label,
        note: cleanStr(ev?.note || ev?.statusNote || ""),
        occurredAt,
        color: cleanColor(ev?.color),
        location: locLite(ev?.location || {}),
        meta: {
          invoicePaid: Boolean(s?.invoice?.paid),
          invoiceAmount: Number(s?.invoice?.amount ?? 0),
          currency: cleanStr(s?.invoice?.currency || "USD") || "USD",
          destination,
          origin,
        },
      };
    });

    // ✅ GROUP: multiple updates under the same stage become ONE stage with entries[]
    // This enables your UI to draw the "small line" between details.
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
          // stage color: last non-empty color we’ve ever set for this stage
          color: e.color || "",
          // header shows latest time/location for that stage
          occurredAt: e.occurredAt,
          location: e.location,
          // all sub updates
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

        // keep header updated to most recent entry
        g.occurredAt = e.occurredAt;
        g.location = e.location;

        // if this new entry has a color, it becomes the stage color
        if (e.color) g.color = e.color;
      }
    }

    const lastGroup = groups[groups.length - 1] || null;
    const currentLocation =
      lastGroup?.location ? fmtLoc(lastGroup.location) : "";

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

      invoice,

      // ✅ IMPORTANT: events are now grouped stages, each has entries[]
      events: groups,

      estimatedDelivery,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}