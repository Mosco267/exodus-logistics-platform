import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function PATCH(req: Request) {
  const body = await req.json();
  const { shipmentId, status, statusNote } = body;

  if (!shipmentId || !status) {
    return NextResponse.json(
      { error: "shipmentId and status are required" },
      { status: 400 }
    );
  }

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB);

  const now = new Date();

  const update: any = {
    status,
    statusNote: statusNote || "",
    statusUpdatedAt: now,
    updatedAt: now,
  };

  if (status.toLowerCase() === "cancelled") {
    update.cancelledAt = now;
  }

  await db.collection("shipments").updateOne(
    { shipmentId },
    { $set: update }
  );

  return NextResponse.json({ ok: true });
}