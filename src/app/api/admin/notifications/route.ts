import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const userId = String(body.userId || "").trim();
    const userEmail = String(body.userEmail || "").trim().toLowerCase();

    const title = String(body.title || "").trim();
    const message = String(body.message || "").trim();
    const shipmentId = body.shipmentId ? String(body.shipmentId).trim() : "";

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