import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { auth } from "@/auth";
import { sendRestoreEmail } from "@/lib/email";

export async function GET() {
  const session = await auth();
  if ((session?.user as any)?.role !== "ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB);

  const users = await db.collection("deleted_users")
    .find({})
    .sort({ deletedAt: -1 })
    .limit(100)
    .toArray();

  const mapped = users.map(u => ({
    id: String(u._id),
    name: u.name || '',
    email: u.email || '',
    country: u.country || '',
    createdAt: u.createdAt || null,
    deletedAt: u.deletedAt || null,
    deletedBy: u.deletedBy || '',
    deleteReason: u.deleteReason || '',
  }));

  return NextResponse.json({ users: mapped });
}

export async function POST(req: Request) {
  const session = await auth();
  if ((session?.user as any)?.role !== "ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { email, action } = await req.json();
  if (!email || !action) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB);
  const lcEmail = email.toLowerCase().trim();

  if (action === "restore") {
    const deletedUser = await db.collection("deleted_users").findOne({ email: lcEmail });
    if (!deletedUser) return NextResponse.json({ error: "User not found in deleted_users" }, { status: 404 });

    // Strip metadata fields and restore the original user document
    const { _id, deletedAt, deletedBy, deleteReason, originalId, ...userData } = deletedUser as any;

    await db.collection("users").insertOne({
      ...userData,
      _id: originalId || _id,
      restoredAt: new Date(),
    });

    await db.collection("deleted_users").deleteOne({ email: lcEmail });
    await db.collection("blocked_emails").deleteOne({ email: lcEmail });

    try { await sendRestoreEmail(email, { name: deletedUser.name || '' }); } catch {}

    return NextResponse.json({ ok: true });
  }

  if (action === "permanent-delete") {
    // Hard delete — wipe deleted_users record AND all associated shipments
    await db.collection("deleted_users").deleteOne({ email: lcEmail });
    await db.collection("users").deleteOne({ email: lcEmail });
    await db.collection("blocked_emails").deleteOne({ email: lcEmail });
    await db.collection("shipments").deleteMany({
      $or: [{ senderEmail: lcEmail }, { receiverEmail: lcEmail }, { createdByEmail: lcEmail }]
    });
    await db.collection("notifications").deleteMany({ userEmail: lcEmail });

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}