// src/app/api/notifications/bulk/route.ts
import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { auth } from "@/auth";
import { ObjectId } from "mongodb";

/**
 * POST — bulk operations on user's own notifications.
 *   Body: { ids: string[], action: "delete" | "markRead" | "markUnread" }
 *
 * Only operates on notifications owned by the requester (userEmail match
 * OR userId match, mirroring the ownership rule in /api/notifications).
 */
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const email = String((session.user as any).email || "").toLowerCase().trim();
    const userId = String((session.user as any).id || "");

    if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const ids = Array.isArray(body?.ids) ? body.ids : [];
    const action = String(body?.action || "").trim();

    if (ids.length === 0) {
      return NextResponse.json({ error: "No ids provided." }, { status: 400 });
    }

    if (!["delete", "markRead", "markUnread"].includes(action)) {
      return NextResponse.json({ error: "Invalid action." }, { status: 400 });
    }

    // Validate ids
    const oids: ObjectId[] = [];
    for (const id of ids) {
      if (typeof id === "string" && ObjectId.isValid(id)) {
        oids.push(new ObjectId(id));
      }
    }
    if (oids.length === 0) {
      return NextResponse.json({ error: "No valid ids." }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    // Ownership query — same logic as your GET /api/notifications
    const ownership = userId
      ? { $or: [{ userId }, { userEmail: email, userId: { $exists: false } }] }
      : { userEmail: email };

    const filter = {
      _id: { $in: oids },
      ...ownership,
    };

    if (action === "delete") {
      const result = await db.collection("notifications").deleteMany(filter);
      return NextResponse.json({ ok: true, count: result.deletedCount });
    }

    if (action === "markRead") {
      const result = await db.collection("notifications").updateMany(
        filter,
        { $set: { read: true, readAt: new Date() } }
      );
      return NextResponse.json({ ok: true, count: result.modifiedCount });
    }

    if (action === "markUnread") {
      const result = await db.collection("notifications").updateMany(
        filter,
        { $set: { read: false }, $unset: { readAt: "" } }
      );
      return NextResponse.json({ ok: true, count: result.modifiedCount });
    }

    return NextResponse.json({ ok: false }, { status: 400 });
  } catch (e) {
    console.error("Bulk notifications error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}