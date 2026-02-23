import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get("limit") || 10), 50);

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    const results = await db
      .collection("shipments")
      .find({}, { projection: { _id: 0 } })
      .sort({ createdAt: -1 }) // ✅ newest created
      .limit(limit)
      .toArray();

    return NextResponse.json({ results });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}