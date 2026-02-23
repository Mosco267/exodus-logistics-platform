import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { auth } from "@/auth";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const qRaw = (searchParams.get("q") || "").trim();

  if (!qRaw) return NextResponse.json({ items: [] });

  // ✅ Force uppercase matching (and keep it safe for regex)
  const q = qRaw.toUpperCase();
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB);

  // ✅ Assumes you will store shipments in "shipments" collection with fields:
  // shipmentId, trackingNumber, sender, destination, status, date
  const items = await db
    .collection("shipments")
    .find(
      {
        $or: [
          { shipmentId: { $regex: "^" + escaped, $options: "i" } },
          { trackingNumber: { $regex: "^" + escaped, $options: "i" } },
        ],
      },
      {
        projection: {
          _id: 0,
          shipmentId: 1,
          trackingNumber: 1,
          sender: 1,
          destination: 1,
          status: 1,
          date: 1,
        },
      }
    )
    .limit(8)
    .toArray();

  return NextResponse.json({ items });
}