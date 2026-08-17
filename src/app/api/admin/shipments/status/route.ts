import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { auth } from "@/auth";

export async function PATCH(req: Request) {
  const session = await auth();
  const role = String((session as any)?.user?.role || "").toUpperCase();
  if (role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { shipmentId, status, statusNote } = body as any;

  if (!shipmentId || !status) {
    return NextResponse.json(
      { error: "shipmentId and status are required" },
      { status: 400 }
    );
  }

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB);
  const now = new Date();

  /* statusNote stays optional. Empty means "use the translated default",
     which is what the status pages render per language. */
  const update: any = {
    status,
    statusNote: String(statusNote ?? "").trim(),
    statusUpdatedAt: now,
    updatedAt: now,
  };

  if (String(status).toLowerCase() === "cancelled") {
    update.cancelledAt = now;
  }

  const res = await db.collection("shipments").updateOne(
    { shipmentId },
    { $set: update }
  );

  if (res.matchedCount === 0) {
    return NextResponse.json({ error: "Shipment not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}