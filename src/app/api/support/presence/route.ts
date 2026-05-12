// src/app/api/support/presence/route.ts
import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { auth } from "@/auth";

/**
 * GET — read current admin presence (for the user to know if support is online).
 * Returns { online: boolean, awayCount, onlineCount }.
 */
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    const doc = await db.collection("admin_presence").findOne({ _id: "current" } as any);

    const onlineCount = Number(doc?.onlineCount || 0);
    const awayEmails = Array.isArray(doc?.awayEmails) ? doc.awayEmails : [];
    // "Available" admins = online ones who haven't toggled away
    const available = Math.max(0, onlineCount - awayEmails.length);

    return NextResponse.json({
      online: available > 0,
      onlineCount,
      availableCount: available,
      awayCount: awayEmails.length,
    });
  } catch (e) {
    console.error("GET presence error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/**
 * PATCH — admin sets their "away" toggle.
 *   Body: { away: boolean }
 */
export async function PATCH(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const email = String((session.user as any).email || "").toLowerCase();
    const role = String((session.user as any).role || "USER");
    if (role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const away = Boolean(body?.away);

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    if (away) {
      await db.collection("admin_presence").updateOne(
        { _id: "current" } as any,
        {
          $addToSet: { awayEmails: email } as any,
          $set: { updatedAt: new Date() } as any,
        },
        { upsert: true }
      );
    } else {
      await db.collection("admin_presence").updateOne(
        { _id: "current" } as any,
        {
          $pull: { awayEmails: email } as any,
          $set: { updatedAt: new Date() } as any,
        },
        { upsert: true }
      );
    }

    return NextResponse.json({ ok: true, away });
  } catch (e) {
    console.error("PATCH presence error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}