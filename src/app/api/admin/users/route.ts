import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { auth } from "@/auth";

export async function GET(req: Request) {
  try {
    // ✅ Admin-only endpoint
    const session = await auth();
    const role = String((session as any)?.user?.role || "").toUpperCase();
    if (role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    // ✅ If userId provided, return single user (only if not deleted)
    if (userId) {
      const _id = ObjectId.isValid(userId) ? new ObjectId(userId) : null;
      if (! _id) return NextResponse.json({ user: null });

      const u = await db.collection("users").findOne(
        { _id, isDeleted: { $ne: true } }, // ✅ hide deleted users
        { projection: { name: 1, email: 1, createdAt: 1 } }
      );

      return NextResponse.json({
        user: u
          ? {
              id: String(u._id),
              name: (u as any).name || "",
              email: (u as any).email || "",
              createdAt: (u as any).createdAt || null,
            }
          : null,
      });
    }

    // ✅ Otherwise list users (exclude deleted)
    const users = await db
      .collection("users")
      .find(
        { isDeleted: { $ne: true } }, // ✅ hide deleted users
        { projection: { name: 1, email: 1, createdAt: 1 } }
      )
      .sort({ createdAt: -1 })
      .limit(200)
      .toArray();

    return NextResponse.json({
      users: users.map((u: any) => ({
        id: String(u._id),
        name: u.name || "",
        email: u.email || "",
        createdAt: u.createdAt || null,
      })),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}