import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { auth } from "@/auth";

export async function POST(req: Request) {
  try {
    const session = await auth();
    const role = String((session as any)?.user?.role || "").toUpperCase();
    const who = String((session as any)?.user?.email || "").toLowerCase().trim();

    // ✅ Only ADMIN can send admin notifications
    if (role !== "ADMIN") {
      // Helpful debug (remove later if you want)
      return NextResponse.json(
        { error: "Forbidden", debug: { role, who } },
        { status: 403 }
      );
    }

    const body = await req.json();

    const userId = String(body.userId || "").trim();
    const userEmail = String(body.userEmail || "").trim().toLowerCase();

    const title = String(body.title || "").trim();
    const message = String(body.message || "").trim();

    // ✅ shipmentId is OPTIONAL
    const shipmentIdRaw = body.shipmentId ? String(body.shipmentId).trim() : "";
    const shipmentId = shipmentIdRaw.length ? shipmentIdRaw : null;

    if (!userId && !userEmail) {
      return NextResponse.json(
        { error: "userId or userEmail is required." },
        { status: 400 }
      );
    }

    if (!title || !message) {
      return NextResponse.json(
        { error: "Title and message are required." },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    const doc = {
      userId: userId || null,
      userEmail: userEmail || null,
      title,
      message,
      shipmentId, // ✅ can be null
      read: false,
      createdAt: new Date(),
      createdBy: who, // ✅ useful for audit
    };

    await db.collection("notifications").insertOne(doc);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message || "Server error" }, { status: 500 });
  }
}