import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

function getEmailFromReq(req: Request) {
  const url = new URL(req.url);
  return (url.searchParams.get("email") || "").toLowerCase().trim();
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const limit = Math.min(Number(url.searchParams.get("limit") || "5"), 200);
    const email = getEmailFromReq(req);

    if (!email) {
      return NextResponse.json({ notifications: [], unreadCount: 0 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    const raw = await db
      .collection("notifications")
      .find({ userEmail: email })
      .sort({ createdAt: -1 })
      .limit(limit)
      .project({ userEmail: 0 })
      .toArray();

    // ✅ make sure _id is always a string
    const notifications = raw.map((n: any) => ({
      ...n,
      _id: String(n._id),
    }));

    

    const unreadCount = await db.collection("notifications").countDocuments({
      userEmail: email,
      read: false,
    });

    return NextResponse.json({ notifications, unreadCount });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ notifications: [], unreadCount: 0 }, { status: 500 });
  }
}