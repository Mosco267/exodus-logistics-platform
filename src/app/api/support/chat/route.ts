// src/app/api/support/chat/route.ts
import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { auth } from "@/auth";
import { ObjectId } from "mongodb";
import { pusherServer, userChatChannel, adminEventsChannel } from "@/lib/pusher-server";

function cleanStr(v: any) { return String(v ?? "").trim(); }

// ─── Constants ─────────────────────────────────────────────
const SUPPORT_DISPLAY_NAME = "Exodus Logistics";
const USER_HISTORY_DAYS = 3;
const AUTO_WELCOME_COOLDOWN_HOURS = 24;
const AUTO_WELCOME_BODY =
  "Hi! Our team is currently away. Please describe your issue in detail and an agent will join you here as soon as they're available.";

// Helper: does any admin appear to be available right now?
async function isAnyAdminAvailable(db: any): Promise<boolean> {
  const doc = await db.collection("admin_presence").findOne({ _id: "current" } as any);
  const onlineCount = Number(doc?.onlineCount || 0);
  const awayEmails = Array.isArray(doc?.awayEmails) ? doc.awayEmails : [];
  return Math.max(0, onlineCount - awayEmails.length) > 0;
}

/**
 * GET — load chat messages.
 *   For users: their own chat. Older-than-3-days messages are filtered out
 *     and `historyTruncated` flag is returned if older messages exist.
 *   Auto-welcome message is inserted if no admin is available and there
 *     hasn't been one in the last 24 hours.
 *   For admins: pass ?userId=... — full history is returned.
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
    if (!targetUserId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    // ─── Auto-welcome logic (user side only) ──────────────────
    let historyTruncated = false;

    if (!isAdmin) {
      const adminAvailable = await isAnyAdminAvailable(db);

      if (!adminAvailable) {
        // Check if we've sent an auto-welcome within the cooldown window
        const cooldownAgo = new Date(Date.now() - AUTO_WELCOME_COOLDOWN_HOURS * 60 * 60 * 1000);
        const recentWelcome = await db.collection("chat_messages").findOne({
          userId: targetUserId,
          isAutoWelcome: true,
          createdAt: { $gte: cooldownAgo },
        });

        if (!recentWelcome) {
          // Insert auto-welcome message authored by "Exodus Logistics"
          const now = new Date();
          await db.collection("chat_messages").insertOne({
            userId: targetUserId,
            userEmail: email,
            authorType: "admin",
            authorEmail: "support@goexoduslogistics.com",
            authorName: SUPPORT_DISPLAY_NAME,
            body: AUTO_WELCOME_BODY,
            attachments: [],
            createdAt: now,
            readByUser: false,
            readByAdmin: true,
            deleted: false,
            deletedAt: null,
            isAutoWelcome: true,
          });

          // Upsert the chat_sessions doc so admin inbox shows this user
          await db.collection("chat_sessions").updateOne(
            { userId: targetUserId },
            {
              $set: {
                userId: targetUserId,
                userEmail: email,
                userName: String((session.user as any).name || email),
                lastMessageAt: now,
                lastMessageBy: "admin",
                lastMessagePreview: AUTO_WELCOME_BODY.slice(0, 100),
                updatedAt: now,
              },
              $setOnInsert: { createdAt: now, unreadByAdmin: 0, unreadByUser: 0 },
            },
            { upsert: true }
          );
        }
      }
    }

    // ─── Build query ──────────────────────────────────────────
    const query: any = {
      userId: targetUserId,
      deleted: { $ne: true },
    };

    if (!isAdmin) {
      // User only sees the last N days
      const cutoff = new Date(Date.now() - USER_HISTORY_DAYS * 24 * 60 * 60 * 1000);
      query.createdAt = { $gte: cutoff };

      // Check if there are older messages so we can tell the user
      const olderCount = await db.collection("chat_messages").countDocuments({
        userId: targetUserId,
        deleted: { $ne: true },
        createdAt: { $lt: cutoff },
      });
      historyTruncated = olderCount > 0;
    }

    const messages = await db.collection("chat_messages")
      .find(query)
      .sort({ createdAt: 1 })
      .limit(500)
      .toArray();

    // ─── Mark as read ─────────────────────────────────────────
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

      try {
        await pusherServer.trigger(adminEventsChannel(), "chat:read", {
          userId: targetUserId,
          by: "user",
        });
      } catch {}
    }

    try {
      await pusherServer.trigger(userChatChannel(targetUserId), "chat:read", {
        by: isAdmin ? "admin" : "user",
      });
    } catch {}

    return NextResponse.json({
      messages: messages.map((m: any) => ({ ...m, _id: m._id.toString() })),
      historyTruncated,
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
 *   Admin messages have authorName = "Exodus Logistics" for display.
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

    // Admin display name override
    const displayName = isAdmin ? SUPPORT_DISPLAY_NAME : userName;

    const msgDoc: any = {
      userId: targetUserId,
      userEmail: targetUserEmail.toLowerCase(),
      authorType,
      authorEmail: email,
      authorName: displayName,
      body: messageBody,
      attachments,
      createdAt: now,
      readByUser: !isAdmin,
      readByAdmin: isAdmin,
      deleted: false,
      deletedAt: null,
    };

    const insert = await db.collection("chat_messages").insertOne(msgDoc);

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

    try {
      await pusherServer.trigger(userChatChannel(targetUserId), "chat:message", outgoingMessage);
      await pusherServer.trigger(adminEventsChannel(), "chat:message", outgoingMessage);
    } catch (e) {
      console.error("Pusher trigger (chat:message) failed:", e);
    }

    // ─── Notifications with link field ─────────────────────────
    if (isAdmin) {
      // Admin sent to user → user notification, link to chat
      try {
        await db.collection("notifications").insertOne({
          userEmail: targetUserEmail.toLowerCase(),
          userId: targetUserId,
          title: "New Message from Support",
          message: messageBody.slice(0, 140) || "Sent you a message",
          link: "/dashboard/support/chat",
          read: false,
          createdAt: now,
        });
      } catch (e) {
        console.error("Notify user (chat) failed:", e);
      }
    } else {
      // User sent to admin → admin notification
      try {
        const adminEmail = process.env.SUPPORT_ADMIN_EMAIL;
        if (adminEmail) {
          await db.collection("notifications").insertOne({
            userEmail: adminEmail.toLowerCase(),
            isAdmin: true,
            title: "New Chat Message",
            message: `${userName}: ${messageBody.slice(0, 140)}`,
            link: `/dashboard/admin/support?tab=chats&userId=${encodeURIComponent(targetUserId)}`,
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
      await pusherServer.trigger(userChatChannel(msg.userId), "chat:delete", { messageId });
      await pusherServer.trigger(adminEventsChannel(), "chat:delete", {
        messageId, userId: msg.userId,
      });
    } catch {}

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE chat error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}