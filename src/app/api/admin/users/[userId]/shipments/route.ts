import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await ctx.params;

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    // We will try to match shipments by either:
    // 1) createdByUserId == userId
    // 2) createdByEmail == user's email (fallback)
    const _id = ObjectId.isValid(userId) ? new ObjectId(userId) : null;

    const user = _id
      ? await db.collection("users").findOne({ _id }, { projection: { email: 1 } })
      : null;

    const email = String((user as any)?.email || "").toLowerCase();

    const or: any[] = [];
    if (userId) or.push({ createdByUserId: String(userId) });
    if (email) or.push({ createdByEmail: email });

    if (or.length === 0) {
      return NextResponse.json({ shipments: [] });
    }

   const shipments = await db
  .collection("shipments")
  .find({
    $or: [
      ...(userId ? [{ createdByUserId: String(userId) }] : []),
      ...(email ? [{ createdByEmail: email }] : []),
    ],
  })
  .project({ _id: 0 })
  .sort({ createdAt: -1 })
  .toArray();

    return NextResponse.json({ shipments });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}