import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET() {
  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB);

  const list = await db.collection("local_availability")
    .find({ enabled: true })
    .toArray();

  return NextResponse.json({
    countries: list.map(c => ({
      countryCode: c.countryCode,
      countryName: c.countryName,
    })),
  });
}