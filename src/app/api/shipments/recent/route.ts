import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { u } from "framer-motion/client";

export async function GET() {
  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB);

  const results = await db
    .collection("shipments")
    .find({})
    .project({
      _id: 0,
      shipmentId: 1,
      trackingNumber: 1,
      senderCountryCode: 1,
      destinationCountryCode: 1,
      status: 1,
      statusColor: 1,     // ✅ ADD
      statusNote: 1,      // ✅ ADD (optional)
      nextStep: 1,        // ✅ ADD (optional)
      createdAt: 1,
      updatedAt: 1,
      invoice: 1,         // ✅ ADD
    })
    .sort({ updatedAt: -1 })
    .limit(10)
    .toArray();

  return NextResponse.json({ results });
}