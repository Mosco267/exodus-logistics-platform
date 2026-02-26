import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { auth } from "@/auth";
import { ObjectId } from "mongodb";

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  const role = String((session as any)?.user?.role || "").toUpperCase();

  if (role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB);

  const blocked = await db.collection("blocked_emails").findOne({
    _id: new ObjectId(params.id),
  });

  if (!blocked) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // remove from blocked list
  await db.collection("blocked_emails").deleteOne({
    _id: new ObjectId(params.id),
  });

  // ✅ send automatic notification
  await db.collection("notifications").insertOne({
    userEmail: blocked.email,
    title: "Account Restored",
    message:
      "Your account has been restored. You may now log in again. If you experience any issues, please contact support.",
    read: false,
    createdAt: new Date(),
  });

  return NextResponse.json({ ok: true });
}