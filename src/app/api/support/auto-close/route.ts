// src/app/api/support/auto-close/route.ts
import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

/**
 * Auto-close tickets that have been in "resolved" status for 30+ days.
 *
 * USAGE:
 *   This is meant to be hit by a daily cron. Two ways to schedule it:
 *
 *   1. Vercel Cron Jobs:
 *      Add to vercel.json:
 *      {
 *        "crons": [
 *          {
 *            "path": "/api/support/auto-close",
 *            "schedule": "0 3 * * *"
 *          }
 *        ]
 *      }
 *
 *   2. External cron (cron-job.org, GitHub Actions, etc.):
 *      GET https://goexoduslogistics.com/api/support/auto-close?key=YOUR_CRON_KEY
 *
 *   In either case, add CRON_SECRET to your env. The endpoint requires it.
 */
export async function GET(req: Request) {
  try {
    // Verify either Vercel cron header or our own ?key= secret
    const url = new URL(req.url);
    const key = url.searchParams.get("key") || "";
    const headerSecret = req.headers.get("authorization") || "";
    const vercelCron = req.headers.get("user-agent")?.includes("vercel-cron");

    const cronSecret = process.env.CRON_SECRET || "";
    const authed =
      vercelCron ||
      (cronSecret && (key === cronSecret || headerSecret === `Bearer ${cronSecret}`));

    if (!authed) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    // Find tickets that have been "resolved" for 30+ days
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const candidates = await db.collection("support_tickets")
      .find({
        status: "resolved",
        resolvedAt: { $lt: cutoff },
      })
      .toArray();

    const now = new Date();
    let closedCount = 0;

    for (const ticket of candidates) {
      await db.collection("support_tickets").updateOne(
        { _id: ticket._id },
        { $set: { status: "closed", closedAt: now, updatedAt: now } }
      );

      // Optional: send a notification to the user
      try {
        await db.collection("notifications").insertOne({
          userEmail: String(ticket.userEmail || "").toLowerCase(),
          userId: ticket.userId,
          title: "Ticket Auto-Closed",
          message: `Your resolved ticket ${ticket.ticketNumber} has been auto-closed after 30 days of inactivity. You can open a new ticket if you need further assistance.`,
          ticketId: ticket._id.toString(),
          ticketNumber: ticket.ticketNumber,
          read: false,
          createdAt: now,
        });
      } catch {}

      closedCount++;
    }

    return NextResponse.json({ ok: true, closed: closedCount });
  } catch (e) {
    console.error("Auto-close error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}