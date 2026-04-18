import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { auth } from "@/auth";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { newEmail, code } = await req.json();
  if (!newEmail || !code)
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const normalizedNew = newEmail.toLowerCase().trim();

const client = await clientPromise;
const db = client.db(process.env.MONGODB_DB);

const sessionId = (session.user as any).id || '';
const { ObjectId } = require('mongodb');

const user = sessionId
  ? await db.collection("users").findOne({ _id: new ObjectId(sessionId) })
  : await db.collection("users").findOne({ email: (session.user.email || '').toLowerCase() });

if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

const currentEmail = user.email.toLowerCase();

  if (user.emailChangeCode !== code)
    return NextResponse.json({ error: "Invalid verification code" }, { status: 400 });

  if (new Date() > new Date(user.emailChangeExpiry))
    return NextResponse.json({ error: "Code has expired. Please request a new one." }, { status: 400 });

  if (user.emailChangePending !== normalizedNew)
    return NextResponse.json({ error: "Email mismatch" }, { status: 400 });

  // Update email
  await db.collection("users").updateOne(
  { _id: user._id },
    {
      $set: { email: normalizedNew },
      $unset: { emailChangeCode: 1, emailChangeExpiry: 1, emailChangePending: 1 },
    }
  );

  return NextResponse.json({ ok: true });
}