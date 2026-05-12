// src/app/api/support/chat/typing/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { pusherServer, userChatChannel } from "@/lib/pusher-server";

/**
 * POST — broadcast a typing event.
 *   For users: { typing: boolean }
 *   For admins: { userId, typing: boolean }
 *
 * Just fires a Pusher event — no DB write. The event auto-expires
 * client-side after ~3 seconds of no follow-up.
 */
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = String((session.user as any).id || "");
    const role = String((session.user as any).role || "USER");
    const isAdmin = role === "ADMIN";

    const body = await req.json().catch(() => ({}));
    const typing = Boolean(body?.typing);
    const targetUserId = isAdmin ? String(body?.userId || "") : userId;

    if (!targetUserId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });

    try {
      await pusherServer.trigger(userChatChannel(targetUserId), "chat:typing", {
        by: isAdmin ? "admin" : "user",
        typing,
      });
    } catch {}

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Typing event error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}