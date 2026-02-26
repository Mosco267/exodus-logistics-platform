// app/api/admin/deleted-users/[id]/route.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import clientPromise from "@/lib/mongodb";
import { auth } from "@/auth";
import { ObjectId } from "mongodb";

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const role = String((session as any)?.user?.role || "").toUpperCase();

    if (role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // ✅ Next.js 16 types params as Promise in some builds
    const p = await ctx.params;
    const rawId = String(p?.id || "").trim();

    if (!rawId || !ObjectId.isValid(rawId)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    // ✅ Unblock by userId (you stored userId: raw in blocked_emails)
    await db.collection("blocked_emails").deleteOne({ userId: rawId });

    // (Optional) You can also clean up soft-delete flags if you want:
    // await db.collection("users").updateOne(
    //   { _id: new ObjectId(rawId) },
    //   { $set: { isDeleted: false }, $unset: { deletedAt: "", deletedBy: "" } }
    // );

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}