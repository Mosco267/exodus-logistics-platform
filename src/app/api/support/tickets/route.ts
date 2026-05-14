// src/app/api/support/tickets/route.ts
import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { auth } from "@/auth";
import { pusherServer, adminEventsChannel } from "@/lib/pusher-server";

function cleanStr(v: any) { return String(v ?? "").trim(); }

function makeTicketNumber(): string {
  const now = new Date();
  const yyyy = String(now.getFullYear());
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const seven = String(Math.floor(Math.random() * 9000000) + 1000000);
  return `EXS-TKT-${yyyy}-${mm}-${seven}`;
}

const VALID_CATEGORIES = new Set([
  "billing", "shipment", "account", "technical", "feature", "other",
]);

const VALID_STATUSES = new Set([
  "open", "awaiting_customer", "in_progress", "resolved", "closed",
]);

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const email = String((session.user as any).email || "").toLowerCase();
    const role = String((session.user as any).role || "USER");
    const isAdmin = role === "ADMIN";

    const url = new URL(req.url);
    const status = cleanStr(url.searchParams.get("status")).toLowerCase();
    const category = cleanStr(url.searchParams.get("category")).toLowerCase();
    const q = cleanStr(url.searchParams.get("q"));

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    const query: any = {};
    if (!isAdmin) query.userEmail = email;
    if (status && VALID_STATUSES.has(status)) query.status = status;
    if (category && VALID_CATEGORIES.has(category)) query.category = category;

    if (q) {
      const safe = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      query.$or = [
        { ticketNumber: { $regex: safe, $options: "i" } },
        { subject: { $regex: safe, $options: "i" } },
      ];
      if (isAdmin) {
        query.$or.push(
          { userEmail: { $regex: safe, $options: "i" } },
          { userName: { $regex: safe, $options: "i" } }
        );
      }
    }

    const tickets = await db.collection("support_tickets")
      .find(query)
      .sort({ updatedAt: -1 })
      .limit(200)
      .toArray();

    const countsQuery: any = {};
    if (!isAdmin) countsQuery.userEmail = email;

    const counts = {
      all: 0, open: 0, awaiting_customer: 0, in_progress: 0, resolved: 0, closed: 0,
    };
    const aggregate = await db.collection("support_tickets").aggregate([
      { $match: countsQuery },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]).toArray();
    aggregate.forEach((row: any) => {
      if (VALID_STATUSES.has(row._id)) (counts as any)[row._id] = row.count;
      counts.all += row.count;
    });

    return NextResponse.json({
      tickets: tickets.map((t: any) => ({ ...t, _id: t._id.toString() })),
      counts,
    });
  } catch (e) {
    console.error("GET tickets error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const email = String((session.user as any).email || "").toLowerCase();
    const userId = String((session.user as any).id || "");
    const userName = String((session.user as any).name || email);

    const body = await req.json().catch(() => ({}));
    const subject = cleanStr(body?.subject);
    const category = cleanStr(body?.category).toLowerCase();
    const messageBody = cleanStr(body?.body);
    const shipmentRef = cleanStr(body?.shipmentRef) || null;
    const attachments = Array.isArray(body?.attachments) ? body.attachments.slice(0, 3) : [];

    if (!subject || subject.length < 3) {
      return NextResponse.json({ error: "Subject is required (min 3 characters)." }, { status: 400 });
    }
    if (!VALID_CATEGORIES.has(category)) {
      return NextResponse.json({ error: "Invalid category." }, { status: 400 });
    }
    if (!messageBody || messageBody.length < 3) {
      return NextResponse.json({ error: "Message is required." }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    let ticketNumber = "";
    for (let i = 0; i < 5; i++) {
      const candidate = makeTicketNumber();
      const exists = await db.collection("support_tickets").findOne({ ticketNumber: candidate });
      if (!exists) { ticketNumber = candidate; break; }
    }
    if (!ticketNumber) return NextResponse.json({ error: "Failed to allocate ticket number" }, { status: 500 });

    const now = new Date();
    const previewText = messageBody.slice(0, 100);

    const ticketDoc: any = {
      ticketNumber, userEmail: email, userId, userName,
      category, subject, status: "open", shipmentRef,
      createdAt: now, updatedAt: now,
      resolvedAt: null, closedAt: null,
      unreadByAdmin: 1, unreadByUser: 0,
      lastMessageAt: now, lastMessageBy: "user", lastMessagePreview: previewText,
    };

    const insert = await db.collection("support_tickets").insertOne(ticketDoc);
    const ticketId = insert.insertedId.toString();

    await db.collection("support_messages").insertOne({
      ticketId, authorType: "user",
      authorEmail: email, authorName: userName,
      body: messageBody, attachments, createdAt: now,
      readByUser: true, readByAdmin: false,
    });

    try {
      await pusherServer.trigger(adminEventsChannel(), "ticket:new", {
        ticketId, ticketNumber,
        userEmail: email, userName,
        subject, category, preview: previewText,
        createdAt: now.toISOString(),
      });
    } catch (e) {
      console.error("Pusher trigger failed (ticket:new):", e);
    }

    try {
      const adminEmail = process.env.SUPPORT_ADMIN_EMAIL;
      if (adminEmail) {
        await db.collection("notifications").insertOne({
          userEmail: adminEmail.toLowerCase(),
          isAdmin: true,
          title: "New Support Ticket",
          message: `${userName} (${email}) opened ticket ${ticketNumber}: "${subject}"`,
          ticketId, ticketNumber,
          link: `/dashboard/admin/support/tickets/${ticketId}`,
          read: false,
          createdAt: now,
        });

        const { sendSupportTicketCreatedAdminEmail } = await import("@/lib/email-support");
        await sendSupportTicketCreatedAdminEmail(adminEmail, {
          ticketNumber, subject, category,
          userName, userEmail: email,
          body: messageBody, shipmentRef,
        });
      }
    } catch (e) {
      console.error("Admin notify (new ticket) failed:", e);
    }

    return NextResponse.json({
      ok: true,
      ticket: { ...ticketDoc, _id: ticketId },
    });
  } catch (e) {
    console.error("POST tickets error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}