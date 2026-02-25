import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { auth } from "@/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = String((session as any)?.user?.role || "USER").toUpperCase();
  const uid = String((session as any)?.user?.id || "");
  const email = String((session as any)?.user?.email || "").toLowerCase().trim();

  // ✅ ADMIN sees everything; normal users only see their own
  const filter =
    role === "ADMIN"
      ? {}
      : {
          $or: [
            ...(uid ? [{ userId: uid }] : []),
            ...(email ? [{ userEmail: email }, { email }] : []), // supports either field name
          ],
        };

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB);

  const results = await db
    .collection("shipments")
    .find(filter)
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