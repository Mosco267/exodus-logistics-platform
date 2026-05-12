// src/app/api/support/pusher-auth/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { pusherServer, userChatChannel, adminPresenceChannel, adminEventsChannel } from "@/lib/pusher-server";

/**
 * Pusher authentication endpoint.
 *
 * The Pusher client sends form-encoded data: socket_id + channel_name.
 * We validate the user's session and that they're allowed to subscribe
 * to the requested channel, then return a signed auth payload.
 *
 * Channels:
 *   private-chat-{userId}    — only the owner or an admin can subscribe
 *   presence-admin           — only admins can subscribe (presence channel)
 *   private-admin-events     — only admins
 */
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userEmail = String((session.user as any).email || "").toLowerCase();
    const userId = String((session.user as any).id || "");
    const role = String((session.user as any).role || "USER");
    const isAdmin = role === "ADMIN";

    // Pusher sends form data
    const text = await req.text();
    const body = new URLSearchParams(text);
    const socketId = body.get("socket_id") || "";
    const channelName = body.get("channel_name") || "";

    if (!socketId || !channelName) {
      return NextResponse.json({ error: "Missing socket_id or channel_name" }, { status: 400 });
    }

    // ─── Authorize the channel ───────────────────────────────
    const isPrivateChat = channelName.startsWith("private-chat-");
    const isPresenceAdmin = channelName === adminPresenceChannel();
    const isAdminEvents = channelName === adminEventsChannel();

    if (isPrivateChat) {
      const channelUserId = channelName.replace("private-chat-", "");
      // The owner can subscribe, OR an admin can subscribe
      if (!isAdmin && channelUserId !== userId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } else if (isPresenceAdmin || isAdminEvents) {
      if (!isAdmin) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } else {
      return NextResponse.json({ error: "Unknown channel" }, { status: 400 });
    }

    // ─── Sign the auth response ──────────────────────────────
    if (isPresenceAdmin) {
      const presenceData = {
        user_id: userId || userEmail,
        user_info: {
          name: (session.user as any).name || userEmail,
          email: userEmail,
        },
      };
      const authData = pusherServer.authorizeChannel(socketId, channelName, presenceData);
      return NextResponse.json(authData);
    }

    const authData = pusherServer.authorizeChannel(socketId, channelName);
    return NextResponse.json(authData);
  } catch (e) {
    console.error("Pusher auth error:", e);
    return NextResponse.json({ error: "Auth failed" }, { status: 500 });
  }
}