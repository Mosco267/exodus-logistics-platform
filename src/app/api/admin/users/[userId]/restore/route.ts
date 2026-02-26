import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { auth } from "@/auth";
import { sendRestoreEmail } from "@/lib/email";

export async function PATCH(_req: Request, ctx: any) {
  try {
    const session = await auth();
    const role = String((session as any)?.user?.role || "").toUpperCase();
    if (role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const p = await Promise.resolve(ctx?.params);
    const rawValue =
      p?.id ?? p?.userId ?? (Array.isArray(p?.slug) ? p.slug[0] : undefined);

    const raw = String(rawValue || "").trim();
    if (!raw || !ObjectId.isValid(raw)) {
      return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    const user = await db.collection("users").findOne({ _id: new ObjectId(raw) });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const email = String((user as any)?.email || "").toLowerCase().trim();
    const name = String((user as any)?.name || "Customer");

    await db.collection("users").updateOne(
      { _id: new ObjectId(raw) },
      { $set: { isDeleted: false }, $unset: { deletedAt: "", deletedBy: "" } }
    );

    // ✅ Unblock signup/login
    if (email) {
      await db.collection("blocked_emails").deleteOne({ email });
    }

    // ✅ In-app notification
    if (email) {
      await db.collection("notifications").insertOne({
        userEmail: email,
        title: "Account restored",
        message:
          "Your account has been restored. You can now log in again. If you need help, contact support.",
        read: false,
        createdAt: new Date(),
      });
    }

    // ✅ Email
    if (email) {
      await sendRestoreEmail(email, { name }).catch(() => null);
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}