import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { auth } from "@/auth";
import { sendDeletedByAdminEmail } from "@/lib/email";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { reason } = await req.json();
  const email = (session.user.email || '').toLowerCase();

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB);

  const user = await db.collection("users").findOne({ email });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Save full user record to deleted_users (so we can restore it)
  await db.collection("deleted_users").insertOne({
    ...user,
    deletedAt: new Date(),
    deletedBy: "self",
    deleteReason: reason?.trim() || "",
    originalId: user._id,
  });

  // Remove from active users (clean separation — deleted account no longer exists in users)
  await db.collection("users").deleteOne({ email });

  // Send deletion confirmation email
  try {
    await sendDeletedByAdminEmail(email, { name: user.name });
  } catch {}

  return NextResponse.json({ ok: true });
}