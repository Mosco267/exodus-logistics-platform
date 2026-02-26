import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

const escapeRegex = (input: string) => input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const ciExact = (field: string, value: string) => ({ [field]: { $regex: `^${escapeRegex(value)}$`, $options: "i" } });

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

    // Minimal “real” invoice: the total is the invoice.amount you already store.
    // You can later expand this into breakdowns using your pricing settings.
    const invoiceNumber = `INV-${String((shipment as any)?.shipmentId || "SHIP").replace(/[^A-Z0-9-]/gi, "")}`;

    return NextResponse.json({
      invoiceNumber,
      status: paid ? "paid" : "pending",
      currency,
      total: amount,
      paid,
      paidAt: inv?.paidAt || null,

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
        senderEmail: (shipment as any)?.senderEmail || (shipment as any)?.createdByEmail || "",
        receiverEmail: (shipment as any)?.receiverEmail || "",
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