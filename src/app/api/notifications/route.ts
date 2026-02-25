import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { auth } from "@/auth";
import { ObjectId } from "mongodb";

export async function GET(req: Request) {
  try {
    const session = await auth();
    const email = String((session as any)?.user?.email || "")
      .toLowerCase()
      .trim();

    // Not logged in -> return empty (not error)
    if (!email) {
      return NextResponse.json({ notifications: [], unreadCount: 0 });
    }

    const url = new URL(req.url);
    const limit = Math.min(Number(url.searchParams.get("limit") || "5"), 200);

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    const raw = await db
      .collection("notifications")
      .find({ userEmail: email })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    const notifications = raw.map((n: any) => ({
      ...n,
      _id: String(n._id),
    }));

    const unreadCount = await db.collection("notifications").countDocuments({
      userEmail: email,
      read: false,
    });

    return NextResponse.json({ notifications, unreadCount });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { notifications: [], unreadCount: 0 },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await auth();
    const email = String((session as any)?.user?.email || "")
      .toLowerCase()
      .trim();

    if (!email) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const id = String(body?.id || "").trim();

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ ok: false, error: "Invalid id" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    // Only mark as read if this notification belongs to the logged-in user
    const result = await db.collection("notifications").updateOne(
      { _id: new ObjectId(id), userEmail: email },
      { $set: { read: true, readAt: new Date() } }
    );

    return NextResponse.json({ ok: true, modifiedCount: result.modifiedCount });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}