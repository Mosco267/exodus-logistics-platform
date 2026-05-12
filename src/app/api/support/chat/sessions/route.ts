// src/app/api/support/chat/sessions/route.ts
import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { auth } from "@/auth";

/**
 * GET — list all chat sessions (admin only).
 * Returns all users who have ever sent a chat message, sorted by recent activity.
 */
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const role = String((session.user as any).role || "USER");
    if (role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const url = new URL(req.url);
    const q = String(url.searchParams.get("q") || "").trim();

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    const query: any = {};
    if (q) {
      const safe = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      query.$or = [
        { userEmail: { $regex: safe, $options: "i" } },
        { userName: { $regex: safe, $options: "i" } },
      ];
    }

    const sessions = await db.collection("chat_sessions")
      .find(query)
      .sort({ updatedAt: -1 })
      .limit(200)
      .toArray();

    return NextResponse.json({
      sessions: sessions.map((s: any) => ({ ...s, _id: s._id.toString() })),
    });
  } catch (e) {
    console.error("GET chat sessions error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}