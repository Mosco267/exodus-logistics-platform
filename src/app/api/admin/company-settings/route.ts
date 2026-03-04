import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET() {
  const dbName = process.env.MONGODB_DB;
  if (!dbName) return NextResponse.json({ error: "Missing MONGODB_DB" }, { status: 500 });

  const client = await clientPromise;
  const db = client.db(dbName);

  const doc = await db.collection("company_settings").findOne({ _id: "default" });
  return NextResponse.json({ ok: true, settings: doc || { _id: "default" } });
}

export async function PATCH(req: Request) {
  const dbName = process.env.MONGODB_DB;
  if (!dbName) return NextResponse.json({ error: "Missing MONGODB_DB" }, { status: 500 });

  let body: any = null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const client = await clientPromise;
  const db = client.db(dbName);

  const update = {
    name: String(body?.name || "").trim(),
    address: String(body?.address || "").trim(),
    phone: String(body?.phone || "").trim(),
    email: String(body?.email || "").trim(),
    registrationNumber: String(body?.registrationNumber || "").trim(),
  };

  await db.collection("company_settings").updateOne(
    { _id: "default" },
    { $set: { _id: "default", ...update } },
    { upsert: true }
  );

  const doc = await db.collection("company_settings").findOne({ _id: "default" });
  return NextResponse.json({ ok: true, settings: doc });
}