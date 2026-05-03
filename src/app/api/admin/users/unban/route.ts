import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { auth } from "@/auth";
import { sendRestoreEmail } from "@/lib/email";

export async function POST(req: Request) {
  const session = await auth();
  if ((session?.user as any)?.role !== "ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB);
  const lcEmail = email.toLowerCase().trim();

  const banned = await db.collection("banned_emails").findOne({ email: lcEmail });
  if (!banned) return NextResponse.json({ error: "Email not banned" }, { status: 404 });

  // Restore original user data if we have it
  if (banned.originalUserData) {
    const { _id, ...userData } = banned.originalUserData as any;
    await db.collection("users").insertOne({ ...userData, _id, unbannedAt: new Date() });
  }

  await db.collection("banned_emails").deleteOne({ email: lcEmail });

  try { await sendRestoreEmail(email, { name: banned.name || '' }); } catch {}

  return NextResponse.json({ ok: true });
}

export async function GET() {
  const session = await auth();
  if ((session?.user as any)?.role !== "ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB);

  const banned = await db.collection("banned_emails")
    .find({})
    .sort({ bannedAt: -1 })
    .limit(200)
    .toArray();

  return NextResponse.json({
    users: banned.map(b => ({
      id: String(b._id),
      email: b.email,
      name: b.name || '',
      reason: b.reason || '',
      bannedAt: b.bannedAt || null,
      bannedBy: b.bannedBy || '',
    }))
  });
}