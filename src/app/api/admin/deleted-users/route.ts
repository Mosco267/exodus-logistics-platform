// app/api/admin/deleted-users/route.ts
import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { auth } from "@/auth";

export async function GET() {
  try {
    const session = await auth();
    const role = String((session as any)?.user?.role || "").toUpperCase();
    if (role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    const users = await db
      .collection("users")
      .find(
        { isDeleted: true },
        { projection: { name: 1, email: 1, createdAt: 1, deletedAt: 1, deletedBy: 1 } }
      )
      .sort({ deletedAt: -1 })
      .limit(300)
      .toArray();

    return NextResponse.json({
      users: users.map((u: any) => ({
        id: String(u._id),
        name: u.name || "",
        email: u.email || "",
        createdAt: u.createdAt || null,
        deletedAt: u.deletedAt || null,
        deletedBy: u.deletedBy || "",
      })),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}