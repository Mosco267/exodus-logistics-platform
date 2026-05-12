// src/app/api/support/pusher-webhook/route.ts
import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import crypto from "crypto";

/**
 * Pusher fires a webhook here whenever an admin connects to or disconnects
 * from the presence-admin channel. We update the admin_presence doc so the
 * user-facing presence indicator reflects reality.
 *
 * SETUP REQUIRED in your Pusher dashboard:
 *   1. Channels → your app → Webhooks
 *   2. Click "Add webhook"
 *   3. URL: https://goexoduslogistics.com/api/support/pusher-webhook
 *   4. Check the "Channel existence" and "Presence" event types
 *   5. Save
 *
 * Pusher signs the request body with your app secret, which we verify below.
 */
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-pusher-signature") || "";

    const secret = process.env.PUSHER_SECRET;
    if (!secret) {
      console.error("PUSHER_SECRET missing — cannot verify webhook");
      return NextResponse.json({ error: "Server config" }, { status: 500 });
    }

    // Verify signature
    const expected = crypto
      .createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex");

    if (expected !== signature) {
      console.warn("Pusher webhook signature mismatch");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const payload = JSON.parse(rawBody);
    const events = Array.isArray(payload?.events) ? payload.events : [];

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    // Process each event
    for (const ev of events) {
      const name = String(ev?.name || "");
      const channel = String(ev?.channel || "");

      if (channel !== "presence-admin") continue;

      if (name === "channel_occupied") {
        // First admin connected — channel went from empty to non-empty
        // We rely on member_added events to count, but reset count here just in case
        await db.collection("admin_presence").updateOne(
          { _id: "current" } as any,
          { $set: { online: true, updatedAt: new Date() } as any },
          { upsert: true }
        );
      } else if (name === "channel_vacated") {
        // All admins disconnected
        await db.collection("admin_presence").updateOne(
          { _id: "current" } as any,
          {
            $set: {
              online: false,
              onlineCount: 0,
              awayEmails: [],
              updatedAt: new Date(),
            } as any,
          },
          { upsert: true }
        );
      } else if (name === "member_added") {
        await db.collection("admin_presence").updateOne(
          { _id: "current" } as any,
          {
            $inc: { onlineCount: 1 } as any,
            $set: { online: true, updatedAt: new Date() } as any,
          },
          { upsert: true }
        );
      } else if (name === "member_removed") {
        // Find what their email was, so we can remove from awayEmails if present
        const userId = String(ev?.user_id || "");
        // Note: Pusher doesn't tell us the email here, only the user_id we set
        // in pusher-auth (which is the user's id field). We'll just decrement.
        await db.collection("admin_presence").updateOne(
          { _id: "current" } as any,
          {
            $inc: { onlineCount: -1 } as any,
            $set: { updatedAt: new Date() } as any,
          },
          { upsert: true }
        );

        // Clean up: if onlineCount drops to 0 or below, reset
        const doc = await db.collection("admin_presence").findOne({ _id: "current" } as any);
        if (doc && (doc.onlineCount || 0) <= 0) {
          await db.collection("admin_presence").updateOne(
            { _id: "current" } as any,
            {
              $set: {
                online: false,
                onlineCount: 0,
                awayEmails: [],
                updatedAt: new Date(),
              } as any,
            }
          );
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Pusher webhook error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}