import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { auth } from "@/auth";
import { ObjectId } from "mongodb";

export async function DELETE(_req: Request, ctx: any) {
  try {
    const session = await auth();
    const email = String((session as any)?.user?.email || "").toLowerCase().trim();

    if (!email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const p = await Promise.resolve(ctx?.params);
    const rawId = String(p?.id || "").trim();

    if (!rawId || !ObjectId.isValid(rawId)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    const del = await db.collection("notifications").deleteOne({
      _id: new ObjectId(rawId),
      userEmail: email,
    });

    if (!del.deletedCount) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message || "Server error" }, { status: 500 });
  }
}