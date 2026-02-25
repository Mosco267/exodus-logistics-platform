import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { auth } from "@/auth";
import { sendDeletedByAdminEmail } from "@/lib/email";

export async function DELETE(_req: Request, ctx: any) {
  try {
    const session = await auth();
    const role = (session as any)?.user?.role;

    if (role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // ✅ Next can pass params as a Promise in some versions
    const p = await Promise.resolve(ctx?.params);

    // supports [id], [userId], and catch-all arrays
    const rawValue =
      p?.id ?? p?.userId ?? (Array.isArray(p?.slug) ? p.slug[0] : undefined);

    const raw = String(rawValue || "").trim();

    if (!raw || !ObjectId.isValid(raw)) {
      return NextResponse.json(
        { error: "Invalid userId", got: raw || null, params: p || null },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    const user = await db.collection("users").findOne({ _id: new ObjectId(raw) });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const email = String((user as any)?.email || "").toLowerCase().trim();
    const name = String((user as any)?.name || "").trim();

    const del = await db.collection("users").deleteOne({ _id: new ObjectId(raw) });

    // Keep blocking email logic
    if (email) {
      await db.collection("blocked_emails").updateOne(
        { email },
        { $set: { email, blockedAt: new Date(), reason: "Deleted by admin" } },
        { upsert: true }
      );
    }

    // ✅ Send "account deleted" email (do NOT fail the delete if email fails)
    let emailSent = false;
    let emailError: string | null = null;

    if (email) {
      try {
        await sendDeletedByAdminEmail(email, { name: name || undefined });
        emailSent = true;
      } catch (e: any) {
        emailError = e?.message || "Email failed";
      }
    }

    return NextResponse.json({
      ok: true,
      deletedCount: del.deletedCount,
      emailBlocked: !!email,
      emailSent,
      emailError,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}