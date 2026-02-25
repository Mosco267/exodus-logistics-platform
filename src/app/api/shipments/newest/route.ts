import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { auth } from "@/auth";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = String((session as any)?.user?.role || "USER").toUpperCase();
    const uid = String((session as any)?.user?.id || "");
    const email = String((session as any)?.user?.email || "").toLowerCase().trim();

    const filter =
      role === "ADMIN"
        ? {}
        : {
            $or: [
              ...(uid ? [{ userId: uid }] : []),
              ...(email ? [{ userEmail: email }, { email }] : []),
            ],
          };

    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get("limit") || 10), 50);

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    const results = await db
      .collection("shipments")
      .find(filter, { projection: { _id: 0 } })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    return NextResponse.json({ results });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}