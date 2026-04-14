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

  if (action === "restore") {
    // Get user before modifying
    const deletedUser = await db.collection("deleted_users").findOne({ email: email.toLowerCase() });

    // Remove deleted flag from user
    await db.collection("users").updateOne(
      { email: email.toLowerCase() },
      { $unset: { deleted: 1, deletedAt: 1, deletedBy: 1 } }
    );

    // Remove from blocked_emails
    await db.collection("blocked_emails").deleteOne({ email: email.toLowerCase() });

    // Remove from deleted_users
    await db.collection("deleted_users").deleteOne({ email: email.toLowerCase() });

    // Send restore email
    try {
      await sendRestoreEmail(email, { name: deletedUser?.name || '' });
    } catch {}

    return NextResponse.json({ ok: true });
  }

  if (action === "permanent-delete") {
    // Remove from all collections permanently
    await db.collection("deleted_users").deleteOne({ email: email.toLowerCase() });
    await db.collection("users").deleteOne({ email: email.toLowerCase() });
    await db.collection("blocked_emails").deleteOne({ email: email.toLowerCase() });

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}