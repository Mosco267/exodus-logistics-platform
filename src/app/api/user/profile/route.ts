import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { auth } from "@/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB);
  const sessionEmail = (session.user.email || '').toLowerCase();
const sessionId = (session.user as any).id || '';

const user = await db.collection("users").findOne(
  sessionId
    ? { $or: [{ email: sessionEmail }, { _id: new (require('mongodb').ObjectId)(sessionId) }] }
    : { email: sessionEmail },
    { projection: { _id: 0, name: 1, email: 1, phone: 1, country: 1, phoneDialCode: 1, address: 1, avatarUrl: 1, createdAt: 1, provider: 1 } }
  );

  return NextResponse.json(user || {});
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, phone, address, country, phoneDialCode } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB);

  const sessionEmail = (session.user.email || '').toLowerCase();
  const sessionId = (session.user as any).id || '';
  const { ObjectId } = require('mongodb');

  const filter = sessionId
    ? { $or: [{ email: sessionEmail }, { _id: new ObjectId(sessionId) }] }
    : { email: sessionEmail };

  await db.collection("users").updateOne(
    filter,
    {
      $set: {
        name: name.trim(),
        phone: phone?.trim() || '',
        address: address?.trim() || '',
        country: country?.trim() || '',
        phoneDialCode: phoneDialCode?.trim() || '',
      }
    }
  );

  return NextResponse.json({ ok: true });
}