// src/lib/notifications.ts
import clientPromise from "@/lib/mongodb";

export async function createNotification(args: {
  userEmail: string;
  userId?: string;
  title: string;
  message: string;
  shipmentId?: string;
}) {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    await db.collection("notifications").insertOne({
      userEmail: args.userEmail.toLowerCase().trim(),
      userId: args.userId || undefined,
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