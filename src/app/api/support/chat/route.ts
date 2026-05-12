// src/app/api/support/chat/route.ts
import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { auth } from "@/auth";
import { ObjectId } from "mongodb";
import { pusherServer, userChatChannel, adminEventsChannel } from "@/lib/pusher-server";

function cleanStr(v: any) { return String(v ?? "").trim(); }

/**
 * GET — load chat messages.
 *   For users: their own chat.
 *   For admins: pass ?userId=... to load a specific user's chat.
 * Also marks messages as read for the requester.
 */
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const email = String((session.user as any).email || "").toLowerCase();
    const userId = String((session.user as any).id || "");
    const role = String((session.user as any).role || "USER");
    const isAdmin = role === "ADMIN";

    const url = new URL(req.url);
    const targetUserId = isAdmin ? cleanStr(url.searchParams.get("userId")) : userId;
    if (!targetUserId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    const messages = await db.collection("chat_messages")
      .find({ userId: targetUserId, deleted: { $ne: true } })
      .sort({ createdAt: 1 })
      .limit(500)
      .toArray();

    // Mark all messages addressed to this side as read
    if (isAdmin) {
      await db.collection("chat_messages").updateMany(
        { userId: targetUserId, readByAdmin: false, deleted: { $ne: true } },
        { $set: { readByAdmin: true } }
      );
      await db.collection("chat_sessions").updateOne(
        { userId: targetUserId },
        { $set: { unreadByAdmin: 0 } }
      );
    } else {
      await db.collection("chat_messages").updateMany(
        { userId: targetUserId, readByUser: false, deleted: { $ne: true } },
        { $set: { readByUser: true } }
      );
      await db.collection("chat_sessions").updateOne(
        { userId: targetUserId },
        { $set: { unreadByUser: 0 } }
      );

      // Tell admins that user has read everything (for read receipts)
      try {
        await pusherServer.trigger(adminEventsChannel(), "chat:read", {
          userId: targetUserId,
          by: "user",
        });
      } catch {}
    }

    // Tell the other side (via the user's private channel) that messages were read
    try {
      await pusherServer.trigger(userChatChannel(targetUserId), "chat:read", {
        by: isAdmin ? "admin" : "user",
      });
    } catch {}

    return NextResponse.json({
      messages: messages.map((m: any) => ({ ...m, _id: m._id.toString() })),
    });
  } catch (e) {
    console.error("GET chat error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/**
 * POST — send a chat message.
 *   For users: { body, attachments? }
 *   For admins: { userId, body, attachments? }
 */
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const email = String((session.user as any).email || "").toLowerCase();
    const userId = String((session.user as any).id || "");
    const userName = String((session.user as any).name || email);
    const role = String((session.user as any).role || "USER");
    const isAdmin = role === "ADMIN";

    const body = await req.json().catch(() => ({}));
    const messageBody = cleanStr(body?.body);
    const attachments = Array.isArray(body?.attachments) ? body.attachments.slice(0, 3) : [];
    const targetUserId = isAdmin ? cleanStr(body?.userId) : userId;

    if (!targetUserId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    if (!messageBody && attachments.length === 0) {
      return NextResponse.json({ error: "Empty message" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    // For admin sending to a user, look up the user's email + name from chat_sessions
    let targetUserEmail = email;
    let targetUserName = userName;

    if (isAdmin) {
      const existingSession = await db.collection("chat_sessions").findOne({ userId: targetUserId });
      if (!existingSession) {
        return NextResponse.json({ error: "Chat session not found" }, { status: 404 });
      }
      targetUserEmail = existingSession.userEmail;
      targetUserName = existingSession.userName;
    }

    const now = new Date();
    const preview = messageBody.slice(0, 100);
    const authorType = isAdmin ? "admin" : "user";

    const msgDoc: any = {
      userId: targetUserId,
      userEmail: targetUserEmail.toLowerCase(),
      authorType,
      authorEmail: email,
      authorName: userName,
      body: messageBody,
      attachments,
      createdAt: now,
      readByUser: !isAdmin,
      readByAdmin: isAdmin,
      deleted: false,
      deletedAt: null,
    };

    const insert = await db.collection("chat_messages").insertOne(msgDoc);

    // Upsert the chat_sessions document
    const sessionUpdate: any = {
      $set: {
        userId: targetUserId,
        userEmail: targetUserEmail.toLowerCase(),
        userName: targetUserName,
        lastMessageAt: now,
        lastMessageBy: authorType,
        lastMessagePreview: preview,
        updatedAt: now,
      },
      $setOnInsert: { createdAt: now },
      $inc: isAdmin ? { unreadByUser: 1 } : { unreadByAdmin: 1 },
    };
    await db.collection("chat_sessions").updateOne(
      { userId: targetUserId },
      sessionUpdate,
      { upsert: true }
    );

    const outgoingMessage = { ...msgDoc, _id: insert.insertedId.toString() };

    // ─── Pusher events ─────────────────────────────────────────
    try {
      // Send to user's private channel (both sides subscribe)
      await pusherServer.trigger(userChatChannel(targetUserId), "chat:message", outgoingMessage);

      // Also tell admins (so the admin chat list updates immediately)
      await pusherServer.trigger(adminEventsChannel(), "chat:message", outgoingMessage);
    } catch (e) {
      console.error("Pusher trigger (chat:message) failed:", e);
    }

    // ─── Notifications ─────────────────────────────────────────
    if (isAdmin) {
      // Admin sent to user → notification only (no email)
      try {
        await db.collection("notifications").insertOne({
          userEmail: targetUserEmail.toLowerCase(),
          userId: targetUserId,
          title: "New Message from Support",
          message: messageBody.slice(0, 140),
          link: "/dashboard/support",
          read: false,
          createdAt: now,
        });
      } catch (e) {
        console.error("Notify user (chat) failed:", e);
      }
    } else {
      // User sent to admin → notification only (no email per your requirement)
      try {
        const adminEmail = process.env.SUPPORT_ADMIN_EMAIL;
        if (adminEmail) {
          await db.collection("notifications").insertOne({
            userEmail: adminEmail.toLowerCase(),
            isAdmin: true,
            title: "New Chat Message",
            message: `${userName}: ${messageBody.slice(0, 140)}`,
            link: `/dashboard/admin/support?userId=${targetUserId}`,
            read: false,
            createdAt: now,
          });
        }
      } catch (e) {
        console.error("Notify admin (chat) failed:", e);
      }
    }

    return NextResponse.json({ ok: true, message: outgoingMessage });
  } catch (e) {
    console.error("POST chat error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/**
 * DELETE — admin soft-deletes a chat message.
 *   Body: { messageId }
 */
export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const role = String((session.user as any).role || "USER");
    if (role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const messageId = cleanStr(body?.messageId);
    if (!messageId) return NextResponse.json({ error: "Missing messageId" }, { status: 400 });

    let oid: ObjectId;
    try { oid = new ObjectId(messageId); } catch {
      return NextResponse.json({ error: "Invalid messageId" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    const msg = await db.collection("chat_messages").findOne({ _id: oid });
    if (!msg) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await db.collection("chat_messages").updateOne(
      { _id: oid },
      { $set: { deleted: true, deletedAt: new Date() } }
    );

    try {
      await pusherServer.trigger(userChatChannel(msg.userId), "chat:delete", {
        messageId,
      });
      await pusherServer.trigger(adminEventsChannel(), "chat:delete", {
        messageId,
        userId: msg.userId,
      });
    } catch {}

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE chat error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}