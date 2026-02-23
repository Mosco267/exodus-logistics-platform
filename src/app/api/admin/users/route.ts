import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    // If userId provided, return single user
    if (userId) {
      const _id = ObjectId.isValid(userId) ? new ObjectId(userId) : null;
      if (!_id) return NextResponse.json({ user: null });

      const u = await db.collection("users").findOne(
        { _id },
        { projection: { name: 1, email: 1, createdAt: 1 } }
      );

      return NextResponse.json({
        user: u
          ? { id: String(u._id), name: (u as any).name, email: (u as any).email, createdAt: (u as any).createdAt }
          : null,
      });
    }

    // Otherwise list users
    const users = await db
      .collection("users")
      .find({}, { projection: { name: 1, email: 1, createdAt: 1 } })
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