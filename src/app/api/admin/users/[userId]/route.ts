import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { auth } from "@/auth";
import { sendDeletedByAdminEmail } from "@/lib/email";

// Helper to extract userId from params consistently
function getUserId(p: any): string {
  return String(p?.userId ?? p?.id ?? (Array.isArray(p?.slug) ? p.slug[0] : "") ?? "").trim();
}

// ─── DELETE: Soft delete (move to deleted_users) ─────────
export async function DELETE(_req: Request, ctx: any) {
  try {
    const session = await auth();
    const role = String((session as any)?.user?.role || "").toUpperCase();

    if (role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const adminEmail = String((session as any)?.user?.email || "").toLowerCase().trim();

    const p = await Promise.resolve(ctx?.params);
    const raw = getUserId(p);

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
    const name = String((user as any)?.name || "Customer");

    // Move full user record to deleted_users (so admin can restore)
    await db.collection("deleted_users").insertOne({
      ...user,
      deletedAt: new Date(),
      deletedBy: adminEmail || "admin",
      deleteReason: "Deleted by admin",
      originalId: user._id,
    });

    // Remove from active users (clean separation)
    await db.collection("users").deleteOne({ _id: new ObjectId(raw) });

    // In-app notification (in case user is logged in elsewhere)
    if (email) {
      await db.collection("notifications").insertOne({
        userEmail: email,
        userId: String(user._id),
        title: "Account access removed",
        message:
          "Your account has been deleted by an administrator. Contact support if you believe this was a mistake.",
        read: false,
        createdAt: new Date(),
      });
    }

    // Email confirmation
    if (email) {
      await sendDeletedByAdminEmail(email, { name }).catch(() => null);
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

// ─── POST: Hard delete (permanent removal) ────────────────
export async function POST(_req: Request, ctx: any) {
  try {
    const session = await auth();
    const role = String((session as any)?.user?.role || "").toUpperCase();

    if (role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const p = await Promise.resolve(ctx?.params);
    const raw = getUserId(p);

    if (!raw || !ObjectId.isValid(raw)) {
      return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    const user = await db.collection("users").findOne({ _id: new ObjectId(raw) });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const email = String((user as any)?.email || "").toLowerCase().trim();

    // Hard delete — permanently removes everything
    await db.collection("users").deleteOne({ _id: new ObjectId(raw) });
    await db.collection("deleted_users").deleteOne({ email });
    await db.collection("blocked_emails").deleteOne({ email });
    await db.collection("banned_emails").deleteOne({ email });
    await db.collection("shipments").deleteMany({
      $or: [{ senderEmail: email }, { receiverEmail: email }, { createdByEmail: email }]
    });
    await db.collection("notifications").deleteMany({ userEmail: email });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

// ─── PATCH: Update user fields ────────────────────────────
export async function PATCH(req: Request, ctx: any) {
  try {
    const session = await auth();
    const role = String((session as any)?.user?.role || "").toUpperCase();
    if (role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const p = await Promise.resolve(ctx?.params);
    const raw = getUserId(p);

    if (!raw || !ObjectId.isValid(raw))
      return NextResponse.json({ error: "Invalid userId" }, { status: 400 });

    const body = await req.json();
    const updates: Record<string, any> = {};
    if (body.name !== undefined) updates.name = String(body.name || "").trim();
    if (body.email !== undefined) updates.email = String(body.email || "").toLowerCase().trim();

    if (Object.keys(updates).length === 0)
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);
    await db.collection("users").updateOne({ _id: new ObjectId(raw) }, { $set: updates });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}