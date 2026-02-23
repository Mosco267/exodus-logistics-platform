import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { generateShipmentId, generateTrackingNumber } from "@/lib/id";

type ShipmentStatus =
  | "Delivered"
  | "In Transit"
  | "Custom Clearance"
  | "Unclaimed"
  | "Created";

type CreateShipmentBody = {
  senderCountryCode: string;
  destinationCountryCode: string;
  senderName?: string;
  receiverName?: string;

  invoiceAmount?: number;
  invoiceCurrency?: "USD" | "EUR" | "GBP" | "NGN" | string;
  invoicePaid?: boolean;

  status?: ShipmentStatus | string;
  statusNote?: string;

  // ✅ NEW: link shipment to user (best: use userId, keep email for display)
  createdByUserId?: string;
  createdByEmail?: string;
};

const normalizeStatus = (status?: string) =>
  (status ?? "")
    .toLowerCase()
    .trim()
    .replace(/[\s_-]+/g, "");

function toTitleStatus(input?: string): ShipmentStatus {
  const s = normalizeStatus(input);
  if (s === "delivered") return "Delivered";
  if (s === "intransit") return "In Transit";
  if (s === "customclearance") return "Custom Clearance";
  if (s === "unclaimed") return "Unclaimed";
  return "Created";
}

export async function POST(req: Request) {
  let body: CreateShipmentBody;
  try {
    body = (await req.json()) as CreateShipmentBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const senderCountryCode = (body.senderCountryCode || "").toUpperCase();
  const destinationCountryCode = (body.destinationCountryCode || "").toUpperCase();

  if (!senderCountryCode || senderCountryCode.length !== 2) {
    return NextResponse.json(
      { error: "senderCountryCode must be 2 letters (e.g. US)" },
      { status: 400 }
    );
  }

  if (!destinationCountryCode || destinationCountryCode.length !== 2) {
    return NextResponse.json(
      { error: "destinationCountryCode must be 2 letters (e.g. NG)" },
      { status: 400 }
    );
  }

  const invoiceAmount = Number(body.invoiceAmount ?? 0);
  if (Number.isNaN(invoiceAmount) || invoiceAmount < 0) {
    return NextResponse.json(
      { error: "invoiceAmount must be a valid number >= 0" },
      { status: 400 }
    );
  }

  const invoiceCurrency = String(body.invoiceCurrency || "USD").toUpperCase();
  const invoicePaid = Boolean(body.invoicePaid);

  const status = typeof body.status === "string" ? body.status : "Created";
  const statusTitle = toTitleStatus(status);

  const defaultStatusNote =
    statusTitle === "Created"
      ? "Shipment has been created and is being processed."
      : `Shipment status updated to ${statusTitle}.`;

  const createdByUserId = String(body.createdByUserId || "").trim() || null;
  const createdByEmail = String(body.createdByEmail || "").trim().toLowerCase() || null;

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB);

  for (let attempt = 0; attempt < 5; attempt++) {
    const shipmentId = generateShipmentId();
    const trackingNumber = generateTrackingNumber(senderCountryCode);

    try {
      const now = new Date();

      const doc = {
        shipmentId,
        trackingNumber,
        senderCountryCode,
        destinationCountryCode,

        // ✅ link to user
        createdByUserId,
        createdByEmail,

        status: statusTitle,
        statusNote: (body.statusNote || defaultStatusNote).trim(),
        statusUpdatedAt: now,
        cancelledAt: null,

        invoice: {
          amount: invoiceAmount,
          currency: invoiceCurrency,
          paid: invoicePaid,
          paidAt: invoicePaid ? now : null,
        },

        senderName: body.senderName || null,
        receiverName: body.receiverName || null,

        createdAt: now,
        updatedAt: now,
      };

      await db.collection("shipments").insertOne(doc);

      return NextResponse.json({ ok: true, shipment: doc }, { status: 201 });
    } catch (err: any) {
      if (err?.code === 11000) continue;
      return NextResponse.json(
        { error: "Failed to create shipment.", details: String(err?.message || err) },
        { status: 500 }
      );
    }
  }

  return NextResponse.json(
    { error: "Could not generate a unique ID, try again." },
    { status: 500 }
  );
}