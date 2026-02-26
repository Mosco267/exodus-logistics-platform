import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { auth } from "@/auth";

export async function GET() {
  const session = await auth();
  const role = String((session as any)?.user?.role || "").toUpperCase();

  if (role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB);

  const users = await db
    .collection("users")
    .find({ isDeleted: true })
    .sort({ deletedAt: -1 })
    .toArray();

  return NextResponse.json({
    users: users.map((u: any) => ({
      id: String(u._id),
      name: u.name || "",
      email: u.email || "",
      deletedAt: u.deletedAt || null,
    })),
  });
}