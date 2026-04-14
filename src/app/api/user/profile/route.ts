import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { auth } from "@/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB);
  const user = await db.collection("users").findOne(
    { email: (session.user.email || '').toLowerCase() },
    { projection: { _id: 0, name: 1, email: 1, phone: 1, country: 1, address: 1, avatarUrl: 1, createdAt: 1, provider: 1 } }
  );

  return NextResponse.json(user || {});
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, phone, address } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB);
  await db.collection("users").updateOne(
    { email: (session.user.email || '').toLowerCase() },
    { $set: { name: name.trim(), phone: phone?.trim() || '', address: address?.trim() || '' } }
  );

  return NextResponse.json({ ok: true });
}