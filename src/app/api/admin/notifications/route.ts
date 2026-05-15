// src/app/api/admin/notifications/route.ts
import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { auth } from "@/auth";
import { ObjectId } from "mongodb";

function cleanStr(v: any) { return String(v ?? "").trim(); }

/**
 * GET — list admin notifications (for the admin bell).
 * These are notifications addressed to SUPPORT_ADMIN_EMAIL with isAdmin: true.
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
 * POST — admin sends a custom notification to a user.
 *   Body: { userId, userEmail, title, message, shipmentId? }
 *
 * The notification is flagged with isCustomAdminMessage: true so the user UI
 * can render it with a distinct "from Exodus Logistics" style.
 */
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const role = String((session.user as any).role || "USER");
    if (role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const userId = cleanStr(body?.userId);
    const userEmail = cleanStr(body?.userEmail).toLowerCase();
    const title = cleanStr(body?.title);
    const message = cleanStr(body?.message);
    const shipmentId = cleanStr(body?.shipmentId) || undefined;

    if (!title || title.length < 1) {
      return NextResponse.json({ error: "Title is required." }, { status: 400 });
    }
    if (!message || message.length < 1) {
      return NextResponse.json({ error: "Message is required." }, { status: 400 });
    }
    if (!userId && !userEmail) {
      return NextResponse.json({ error: "Missing recipient (userId or userEmail)." }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    const doc: any = {
      title,
      message,
      isCustomAdminMessage: true,    // ✅ distinguishes admin-sent custom notifications
      sentByAdminEmail: String((session.user as any).email || "").toLowerCase(),
      read: false,
      createdAt: new Date(),
    };
    if (userId) doc.userId = userId;
    if (userEmail) doc.userEmail = userEmail;
    if (shipmentId) doc.shipmentId = shipmentId;

    const result = await db.collection("notifications").insertOne(doc);

    return NextResponse.json({
      ok: true,
      notification: { ...doc, _id: result.insertedId.toString() },
    });
  } catch (e) {
    console.error("POST admin notifications error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/**
 * PATCH — mark admin notifications as read (for the admin bell).
 *   Body: { id } single, OR { markAllRead: true }.
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