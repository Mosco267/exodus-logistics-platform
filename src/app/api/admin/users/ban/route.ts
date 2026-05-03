import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { auth } from "@/auth";
import { sendBanEmail } from "@/lib/email";

export async function POST(req: Request) {
  const session = await auth();
  if ((session?.user as any)?.role !== "ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { email, reason } = await req.json();
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB);
  const lcEmail = email.toLowerCase().trim();

  const user = await db.collection("users").findOne({ email: lcEmail });
  const userName = user?.name || '';

  // Add to banned_emails (shipments are KEPT, only the user record is removed)
  await db.collection("banned_emails").insertOne({
    email: lcEmail,
    name: userName,
    reason: reason || 'Violation of policies',
    bannedAt: new Date(),
    bannedBy: (session?.user as any)?.email || 'admin',
    originalUserData: user || null,
  });

  // Remove from active users
  await db.collection("users").deleteOne({ email: lcEmail });
  // Remove from deleted_users if they were soft-deleted before being banned
  await db.collection("deleted_users").deleteOne({ email: lcEmail });

  try { await sendBanEmail(email, { name: userName }); } catch {}

  return NextResponse.json({ ok: true });
}