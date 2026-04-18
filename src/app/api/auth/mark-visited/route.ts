import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { auth } from "@/auth";

export async function POST() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB);

  const sessionEmail = (session.user.email || '').toLowerCase();
const sessionId = (session.user as any).id || '';
const { ObjectId } = require('mongodb');

await db.collection("users").updateOne(
  sessionId
    ? { $or: [{ email: sessionEmail }, { _id: new ObjectId(sessionId) }] }
    : { email: sessionEmail },
  { $set: { hasVisitedDashboard: true } }
);

  return NextResponse.json({ ok: true });
}