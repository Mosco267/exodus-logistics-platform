import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

function escapeRegExp(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const qRaw = (searchParams.get("q") || "").trim();

  if (!qRaw) return NextResponse.json({ results: [] });

  const q = escapeRegExp(qRaw.toUpperCase());

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB);

  const results = await db
    .collection("shipments")
    .find({
      $or: [
        { trackingNumber: { $regex: `^${q}`, $options: "i" } },
        { shipmentId: { $regex: `^${q}`, $options: "i" } },
      ],
    })
    .project({ _id: 0, trackingNumber: 1, shipmentId: 1, status: 1, createdAt: 1 })
    .sort({ createdAt: -1 })
    .limit(8)
    .toArray();

  return NextResponse.json({ results });
}