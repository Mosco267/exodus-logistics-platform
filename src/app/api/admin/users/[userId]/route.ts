import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { auth } from "@/auth";
import { sendBanEmail } from "@/lib/email";

export async function DELETE(_req: Request, ctx: any) {
  try {
    const session = await auth();
    const role = String((session as any)?.user?.role || "").toUpperCase();

    if (role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const adminEmail = String((session as any)?.user?.email || "").toLowerCase().trim();

    const p = await Promise.resolve(ctx?.params);
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

    // ✅ Soft delete (enterprise style)
    const email = String((user as any)?.email || "").toLowerCase().trim();
    const name = String((user as any)?.name || "Customer");

    await db.collection("users").updateOne(
      { _id: new ObjectId(raw) },
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: adminEmail || "admin",
        },
      }
    );

    // ✅ Keep blocked_emails in sync (prevents re-signup)
    if (email) {
      await db.collection("blocked_emails").updateOne(
        { email },
        {
          $set: {
            email,
            blockedAt: new Date(),
            reason: "Soft deleted by admin",
            userId: raw,
          },
        },
        { upsert: true }
      );
    }

    // ✅ In-app notification (so user sees it if already logged in somewhere)
    if (email) {
      await db.collection("notifications").insertOne({
        userEmail: email,
        title: "Account access removed",
        message:
          "Your account access has been removed. If you believe this was a mistake, contact support.",
        read: false,
        createdAt: new Date(),
      });
    }

    // ✅ Email (Resend)
    if (email) {
      await sendBanEmail(email, { name }).catch(() => null);
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

export async function POST(_req: Request, ctx: any) {
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
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const email = String((user as any)?.email || "").toLowerCase().trim();

    // Hard delete — permanently removes the document
    await db.collection("users").deleteOne({ _id: new ObjectId(raw) });

    // Remove from blocked_emails too
    if (email) {
      await db.collection("blocked_emails").deleteOne({ email });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request, ctx: any) {
  try {
    const session = await auth();
    const role = String((session as any)?.user?.role || "").toUpperCase();
    if (role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const p = await Promise.resolve(ctx?.params);
    const rawValue = p?.id ?? p?.userId ?? (Array.isArray(p?.slug) ? p.slug[0] : undefined);
    const raw = String(rawValue || "").trim();
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