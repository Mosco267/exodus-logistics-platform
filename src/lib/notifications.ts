// src/lib/notifications.ts
import clientPromise from "@/lib/mongodb";

/**
 * Writes an in-app notification.
 *
 * Prefer `titleKey` / `messageKey` over `title` / `message`. Keys are
 * rendered in the reader's language at display time, so a French customer
 * sees French even for a notification written months ago. Plain strings
 * are stored as-is and stay in whatever language they were written in.
 *
 * Passing both is fine and recommended during rollout: the key is used
 * when the client understands it, the string when it doesn't.
 */
export async function createNotification(args: {
  userEmail: string;
  userId?: string;

  /** Translation keys, e.g. "Notif.shipmentCreatedTitle" */
  titleKey?: string;
  messageKey?: string;
  /** Values interpolated into the keys, e.g. { shipmentId: "EXS-…" } */
  vars?: Record<string, string | number>;

  /** Literal text. Used as fallback when no key is given. */
  title?: string;
  message?: string;

  shipmentId?: string;
}) {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    if (!args.titleKey && !args.title) {
      console.error("createNotification: needs titleKey or title");
      return;
    }

    await db.collection("notifications").insertOne({
      userEmail: args.userEmail.toLowerCase().trim(),
      userId: args.userId || undefined,

      titleKey: args.titleKey,
      messageKey: args.messageKey,
      vars: args.vars && Object.keys(args.vars).length ? args.vars : undefined,

      title: args.title,
      message: args.message,

      shipmentId: args.shipmentId,
      read: false,
      createdAt: new Date(),
    });
  } catch (e) {
    console.error("Failed to create notification:", e);
  }
}