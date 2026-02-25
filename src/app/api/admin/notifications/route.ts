import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { auth } from "@/auth";

export async function POST(req: Request) {
  try {
    const session = await auth();
    const role = String((session as any)?.user?.role || "");
    if (role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();

    const userId = String(body.userId || "").trim();
    const userEmail = String(body.userEmail || "").trim().toLowerCase();

    const title = String(body.title || "").trim();
    const message = String(body.message || "").trim();

    // ✅ optional shipment reference
    const shipmentIdInput = String(body.shipmentId || "").trim();        // EXS-...
    const trackingInput = String(body.trackingNumber || "").trim();      // EX...

    if (!userId && !userEmail) {
      return NextResponse.json({ error: "userId or userEmail is required." }, { status: 400 });
    }
    if (!title || !message) {
      return NextResponse.json({ error: "Title and message are required." }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    // ✅ Resolve shipmentId if shipmentId or trackingNumber is provided
    let resolvedShipmentId: string | null = null;

    if (shipmentIdInput || trackingInput) {
      const shipment = await db.collection("shipments").findOne(
        shipmentIdInput
          ? { shipmentId: shipmentIdInput }
          : { trackingNumber: trackingInput },
        { projection: { shipmentId: 1 } }
      );

      if (!shipment) {
        return NextResponse.json(
          { error: "Shipment not found. Check shipmentId/trackingNumber." },
          { status: 404 }
        );
      }

      resolvedShipmentId = String((shipment as any).shipmentId || null);
    }

    const doc = {
      userId: userId || null,
      userEmail: userEmail || null,
      title,
      message,
      shipmentId: resolvedShipmentId, // ✅ only stored if valid
      read: false,
      createdAt: new Date(),
    };

    await db.collection("notifications").insertOne(doc);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}