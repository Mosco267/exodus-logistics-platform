import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { auth } from "@/auth";

export async function GET() {
  const session = await auth();
  const role = String((session as any)?.user?.role || "USER").toUpperCase();
  const userId = String((session as any)?.user?.id || "");
  const email = String((session as any)?.user?.email || "").toLowerCase().trim();

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB);

  const match =
    role === "ADMIN"
      ? {}
      : {
          $or: [
            ...(userId ? [{ createdByUserId: userId }] : []),
            ...(email ? [{ createdByEmail: email }] : []),
          ],
        };

  const results = await db
    .collection("shipments")
    .find(match)
    .project({
      _id: 0,
      shipmentId: 1,
      trackingNumber: 1,
      senderCountryCode: 1,
      destinationCountryCode: 1,
      status: 1,
      statusColor: 1,
      statusNote: 1,
      nextStep: 1,
      createdAt: 1,
      updatedAt: 1,
      invoice: 1,
    })
    .sort({ updatedAt: -1 })
    .limit(10)
    .toArray();

  return NextResponse.json({ results });
}