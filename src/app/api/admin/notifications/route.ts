import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { auth } from "@/auth";

export async function POST(req: Request) {
  try {
    const session = await auth();
    const role = String((session as any)?.user?.role || "").toUpperCase();
    if (role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();

    const userId = String(body.userId || "").trim();
    const userEmail = String(body.userEmail || "").trim().toLowerCase();

    const title = String(body.title || "").trim();
    const message = String(body.message || "").trim();

    // admin might send shipmentId OR trackingNumber OR random text
    let shipmentId = body.shipmentId ? String(body.shipmentId).trim() : "";

    if (!userId && !userEmail) {
      return NextResponse.json({ error: "userId or userEmail is required." }, { status: 400 });
    }
    if (!title || !message) {
      return NextResponse.json({ error: "Title and message are required." }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    // ✅ If shipmentId looks like a tracking number (EX26US...) or not like EXS-..., try to convert it
    // Your real shipmentId format: EXS-YYMMDD-XXXXXX
    const looksLikeShipmentId = /^EXS-\d{6}-[A-Z0-9]{6}$/i.test(shipmentId);
    const looksLikeTracking = /^EX\d{2}[A-Z]{2}\d{7}[A-Z]$/i.test(shipmentId);

    if (shipmentId && (!looksLikeShipmentId || looksLikeTracking)) {
      const byTracking = await db.collection("shipments").findOne(
        { trackingNumber: shipmentId },
        { projection: { shipmentId: 1 } }
      );

      if (byTracking?.shipmentId) {
        shipmentId = String((byTracking as any).shipmentId);
      }
      // if not found, we keep shipmentId as-is (so you can still send general notifications)
    }

    const doc = {
      userId: userId || null,
      userEmail: userEmail || null,
      title,
      message,
      shipmentId: shipmentId || null,
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