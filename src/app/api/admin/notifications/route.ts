import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { auth } from "@/auth";

function isAdminSession(session: any) {
  const role = String(session?.user?.role || "").toUpperCase();
  const email = String(session?.user?.email || "").toLowerCase().trim();

  // optional: add your email here (or put in .env as ADMIN_EMAILS)
  const allowed = String(process.env.ADMIN_EMAILS || "")
    .toLowerCase()
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  return role === "ADMIN" || (email && allowed.includes(email));
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!isAdminSession(session)) {
      return NextResponse.json(
        { error: "Forbidden", role: (session as any)?.user?.role || null },
        { status: 403 }
      );
    }

    const body = await req.json();

    const userId = String(body.userId || "").trim();
    const userEmail = String(body.userEmail || "").trim().toLowerCase();

    const title = String(body.title || "").trim();
    const message = String(body.message || "").trim();

    // ✅ shipmentId is OPTIONAL
    let shipmentId = body.shipmentId ? String(body.shipmentId).trim() : "";

    if (!userId && !userEmail) {
      return NextResponse.json({ error: "userId or userEmail is required." }, { status: 400 });
    }
    if (!title || !message) {
      return NextResponse.json({ error: "Title and message are required." }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    // ✅ If admin typed a tracking number, convert to shipmentId (but only if shipmentId was provided)
    const looksLikeShipmentId = /^EXS-\d{6}-[A-Z0-9]{6}$/i.test(shipmentId);
    const looksLikeTracking = /^EX\d{2}[A-Z]{2}\d{7}[A-Z]$/i.test(shipmentId);

    if (shipmentId && (!looksLikeShipmentId || looksLikeTracking)) {
      const byTracking = await db.collection("shipments").findOne(
        { trackingNumber: shipmentId },
        { projection: { shipmentId: 1 } }
      );
      if (byTracking?.shipmentId) shipmentId = String((byTracking as any).shipmentId);
    }

    await db.collection("notifications").insertOne({
      userId: userId || null,
      userEmail: userEmail || null,
      title,
      message,
      shipmentId: shipmentId || null, // ✅ null when not provided
      read: false,
      createdAt: new Date(),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}