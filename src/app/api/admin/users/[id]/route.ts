import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { auth } from "@/auth";
import { ObjectId } from "mongodb";
import { sendDeletedByAdminEmail } from "@/lib/email";

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if ((session?.user as any)?.role !== "ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = params.id;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB);

  let user;
  try {
    user = await db.collection("users").findOne({ _id: new ObjectId(id) });
  } catch {
    return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
  }
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const email = (user.email || "").toLowerCase();

  // Soft delete — copy to deleted_users, remove from users
  await db.collection("deleted_users").insertOne({
    ...user,
    deletedAt: new Date(),
    deletedBy: "admin",
    deleteReason: "Deleted by admin",
    originalId: user._id,
  });

  await db.collection("users").deleteOne({ _id: new ObjectId(id) });

  try { await sendDeletedByAdminEmail(email, { name: user.name }); } catch {}

  return NextResponse.json({ ok: true });
}