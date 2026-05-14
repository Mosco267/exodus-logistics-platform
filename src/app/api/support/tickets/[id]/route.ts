// src/app/api/support/tickets/[id]/route.ts
import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { auth } from "@/auth";
import { ObjectId } from "mongodb";
import { pusherServer, userChatChannel, adminEventsChannel } from "@/lib/pusher-server";

function cleanStr(v: any) { return String(v ?? "").trim(); }

const SUPPORT_DISPLAY_NAME = "Exodus Logistics";

const VALID_STATUSES = new Set([
  "open", "awaiting_customer", "in_progress", "resolved", "closed",
]);

function safeOid(id: string): ObjectId | null {
  try { return new ObjectId(id); } catch { return null; }
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const email = String((session.user as any).email || "").toLowerCase();
    const role = String((session.user as any).role || "USER");
    const isAdmin = role === "ADMIN";

    const { id } = await params;
    const oid = safeOid(id);
    if (!oid) return NextResponse.json({ error: "Invalid ticket id" }, { status: 400 });

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    const ticket = await db.collection("support_tickets").findOne({ _id: oid });
    if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

    if (!isAdmin && cleanStr(ticket.userEmail).toLowerCase() !== email) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const messages = await db.collection("support_messages")
      .find({ ticketId: id })
      .sort({ createdAt: 1 })
      .toArray();

    if (isAdmin) {
      await db.collection("support_messages").updateMany(
        { ticketId: id, readByAdmin: false },
        { $set: { readByAdmin: true } }
      );
      await db.collection("support_tickets").updateOne(
        { _id: oid }, { $set: { unreadByAdmin: 0 } }
      );
    } else {
      await db.collection("support_messages").updateMany(
        { ticketId: id, readByUser: false },
        { $set: { readByUser: true } }
      );
      await db.collection("support_tickets").updateOne(
        { _id: oid }, { $set: { unreadByUser: 0 } }
      );
    }

    return NextResponse.json({
      ticket: { ...ticket, _id: ticket._id.toString() },
      messages: messages.map((m: any) => ({ ...m, _id: m._id.toString() })),
    });
  } catch (e) {
    console.error("GET ticket detail error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const email = String((session.user as any).email || "").toLowerCase();
    const userName = String((session.user as any).name || email);
    const role = String((session.user as any).role || "USER");
    const isAdmin = role === "ADMIN";

    const { id } = await params;
    const oid = safeOid(id);
    if (!oid) return NextResponse.json({ error: "Invalid ticket id" }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const messageBody = cleanStr(body?.body);
    const attachments = Array.isArray(body?.attachments) ? body.attachments.slice(0, 3) : [];

    if (!messageBody || messageBody.length < 1) {
      return NextResponse.json({ error: "Reply body is required." }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    const ticket = await db.collection("support_tickets").findOne({ _id: oid });
    if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

    if (!isAdmin && cleanStr(ticket.userEmail).toLowerCase() !== email) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (ticket.status === "closed") {
      return NextResponse.json(
        { error: "This ticket is closed. Please open a new ticket." },
        { status: 400 }
      );
    }

    const now = new Date();
    const previewText = messageBody.slice(0, 100);
    const authorType = isAdmin ? "admin" : "user";

    // Admin display name override
    const displayName = isAdmin ? SUPPORT_DISPLAY_NAME : userName;

    let newStatus = ticket.status;
    if (isAdmin) {
      if (ticket.status === "open") newStatus = "awaiting_customer";
      if (ticket.status === "resolved") newStatus = "awaiting_customer";
    } else {
      if (ticket.status === "resolved") newStatus = "open";
      else if (ticket.status === "awaiting_customer") newStatus = "open";
    }

    await db.collection("support_messages").insertOne({
      ticketId: id,
      authorType,
      authorEmail: email,
      authorName: displayName,
      body: messageBody,
      attachments,
      createdAt: now,
      readByUser: !isAdmin,
      readByAdmin: isAdmin,
    });

    const update: any = {
      $set: {
        updatedAt: now,
        lastMessageAt: now,
        lastMessageBy: authorType,
        lastMessagePreview: previewText,
        status: newStatus,
      },
    };
    if (isAdmin) update.$inc = { unreadByUser: 1 };
    else update.$inc = { unreadByAdmin: 1 };
    if (newStatus === "open" && ticket.status === "resolved") update.$set.resolvedAt = null;
    await db.collection("support_tickets").updateOne({ _id: oid }, update);

    if (isAdmin) {
      try {
        await db.collection("notifications").insertOne({
          userEmail: cleanStr(ticket.userEmail).toLowerCase(),
          userId: ticket.userId || undefined,
          title: "Support Team Replied",
          message: `Support replied to your ticket ${ticket.ticketNumber}: "${ticket.subject}"`,
          ticketId: id,
          ticketNumber: ticket.ticketNumber,
          link: `/dashboard/support/tickets/${id}`,
          read: false,
          createdAt: now,
        });

        const { sendSupportTicketReplyUserEmail } = await import("@/lib/email-support");
        await sendSupportTicketReplyUserEmail(ticket.userEmail, {
          ticketNumber: ticket.ticketNumber,
          subject: ticket.subject,
          userName: ticket.userName,
          replyBody: messageBody,
        });
      } catch (e) {
        console.error("Notify user (ticket reply) failed:", e);
      }

      try {
        await pusherServer.trigger(userChatChannel(ticket.userId), "ticket:reply", {
          ticketId: id,
          ticketNumber: ticket.ticketNumber,
          authorType: "admin",
          body: messageBody,
          createdAt: now.toISOString(),
        });
      } catch (e) {
        console.error("Pusher trigger (ticket:reply admin) failed:", e);
      }
    } else {
      try {
        const adminEmail = process.env.SUPPORT_ADMIN_EMAIL;
        if (adminEmail) {
          await db.collection("notifications").insertOne({
            userEmail: adminEmail.toLowerCase(),
            isAdmin: true,
            title: "New Ticket Reply",
            message: `${userName} replied to ticket ${ticket.ticketNumber}: "${ticket.subject}"`,
            ticketId: id,
            ticketNumber: ticket.ticketNumber,
            link: `/dashboard/admin/support/tickets/${id}`,
            read: false,
            createdAt: now,
          });
        }
      } catch (e) {
        console.error("Notify admin (ticket reply) failed:", e);
      }

      try {
        await pusherServer.trigger(adminEventsChannel(), "ticket:reply", {
          ticketId: id,
          ticketNumber: ticket.ticketNumber,
          userEmail: ticket.userEmail,
          userName: ticket.userName,
          subject: ticket.subject,
          preview: previewText,
          createdAt: now.toISOString(),
        });
      } catch (e) {
        console.error("Pusher trigger (ticket:reply user) failed:", e);
      }
    }

    return NextResponse.json({ ok: true, status: newStatus });
  } catch (e) {
    console.error("POST ticket reply error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const role = String((session.user as any).role || "USER");
    if (role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    const oid = safeOid(id);
    if (!oid) return NextResponse.json({ error: "Invalid ticket id" }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const newStatus = cleanStr(body?.status).toLowerCase();
    if (!VALID_STATUSES.has(newStatus)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    const ticket = await db.collection("support_tickets").findOne({ _id: oid });
    if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

    const now = new Date();
    const update: any = { $set: { status: newStatus, updatedAt: now } };
    if (newStatus === "resolved") update.$set.resolvedAt = now;
    if (newStatus === "closed") update.$set.closedAt = now;
    if (newStatus === "open" || newStatus === "in_progress" || newStatus === "awaiting_customer") {
      update.$set.resolvedAt = null;
      update.$set.closedAt = null;
    }

    await db.collection("support_tickets").updateOne({ _id: oid }, update);

    try {
      await db.collection("notifications").insertOne({
        userEmail: cleanStr(ticket.userEmail).toLowerCase(),
        userId: ticket.userId || undefined,
        title: `Ticket ${newStatus.replace("_", " ")}`,
        message: `Your ticket ${ticket.ticketNumber} has been marked as "${newStatus.replace("_", " ")}".`,
        ticketId: id,
        ticketNumber: ticket.ticketNumber,
        link: `/dashboard/support/tickets/${id}`,
        read: false,
        createdAt: now,
      });

      if (ticket.userId) {
        await pusherServer.trigger(userChatChannel(ticket.userId), "ticket:status", {
          ticketId: id, status: newStatus,
        });
      }
    } catch (e) {
      console.error("Status change notify failed:", e);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("PATCH ticket error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}