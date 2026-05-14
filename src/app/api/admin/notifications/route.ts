// src/app/api/admin/notifications/route.ts
import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { auth } from "@/auth";
import { ObjectId } from "mongodb";

/**
 * GET — list admin notifications (notifications with isAdmin: true that
 * belong to the support admin email).
 * Returns { notifications, unreadCount }.
 */
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const role = String((session.user as any).role || "USER");
    if (role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const adminEmail = String(process.env.SUPPORT_ADMIN_EMAIL || "").toLowerCase();
    if (!adminEmail) {
      return NextResponse.json({ notifications: [], unreadCount: 0 });
    }

    const url = new URL(req.url);
    const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit")) || 20));

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    const query = { userEmail: adminEmail, isAdmin: true };

    const [notifications, unreadCount] = await Promise.all([
      db.collection("notifications")
        .find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .toArray(),
      db.collection("notifications").countDocuments({ ...query, read: false }),
    ]);

    return NextResponse.json({
      notifications: notifications.map((n: any) => ({ ...n, _id: n._id.toString() })),
      unreadCount,
    });
  } catch (e) {
    console.error("GET admin notifications error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/**
 * PATCH — mark notifications as read.
 *   Body: { id } to mark a single one, OR { markAllRead: true } for all.
 */
export async function PATCH(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const role = String((session.user as any).role || "USER");
    if (role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const adminEmail = String(process.env.SUPPORT_ADMIN_EMAIL || "").toLowerCase();
    if (!adminEmail) return NextResponse.json({ ok: true });

    const body = await req.json().catch(() => ({}));
    const markAllRead = Boolean(body?.markAllRead);
    const id = String(body?.id || "").trim();

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    if (markAllRead) {
      await db.collection("notifications").updateMany(
        { userEmail: adminEmail, isAdmin: true, read: false },
        { $set: { read: true } }
      );
      return NextResponse.json({ ok: true });
    }

    if (id) {
      let oid: ObjectId | null = null;
      try { oid = new ObjectId(id); } catch {}
      if (oid) {
        await db.collection("notifications").updateOne(
          { _id: oid, userEmail: adminEmail, isAdmin: true },
          { $set: { read: true } }
        );
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("PATCH admin notifications error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}