// src/app/api/admin/contact-messages/route.ts
import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { auth } from "@/auth";
import { ObjectId } from "mongodb";

async function requireAdmin() {
  const session = await auth();
  const role = String((session as any)?.user?.role || "").toUpperCase();
  return role === "ADMIN";
}

function escapeRegex(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function GET(req: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const url = new URL(req.url);
    const status = String(url.searchParams.get("status") || "").toLowerCase();
    const subject = String(url.searchParams.get("subject") || "").toLowerCase();
    const q = String(url.searchParams.get("q") || "").trim();
    const limitRaw = parseInt(url.searchParams.get("limit") || "100", 10);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 300) : 100;

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    const filter: any = {};
    if (["new", "read", "replied"].includes(status)) filter.status = status;
    if (subject) filter.subject = subject;
    if (q) {
      const rx = { $regex: escapeRegex(q), $options: "i" };
      filter.$or = [{ name: rx }, { email: rx }, { company: rx }, { message: rx }];
    }

    const messages = await db.collection("contact_messages")
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    /* Counts come from the whole collection, not the filtered view, so the
       tab numbers stay meaningful while a filter is applied. */
    const [total, newCount, readCount, repliedCount] = await Promise.all([
      db.collection("contact_messages").countDocuments({}),
      db.collection("contact_messages").countDocuments({ status: "new" }),
      db.collection("contact_messages").countDocuments({ status: "read" }),
      db.collection("contact_messages").countDocuments({ status: "replied" }),
    ]);

    return NextResponse.json({
      ok: true,
      messages: messages.map((m: any) => ({ ...m, _id: String(m._id) })),
      counts: { all: total, new: newCount, read: readCount, replied: repliedCount },
    });
  } catch (e) {
    console.error("/api/admin/contact-messages GET", e);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const ids: string[] = Array.isArray((body as any)?.ids) ? (body as any).ids : [];
    const status = String((body as any)?.status || "").toLowerCase();

    if (ids.length === 0) return NextResponse.json({ error: "MISSING_IDS" }, { status: 400 });
    if (!["new", "read", "replied"].includes(status)) {
      return NextResponse.json({ error: "INVALID_STATUS" }, { status: 400 });
    }

    const objectIds = ids.filter(id => ObjectId.isValid(id)).map(id => new ObjectId(id));
    if (objectIds.length === 0) return NextResponse.json({ error: "MISSING_IDS" }, { status: 400 });

    const now = new Date();
    const $set: any = { status };
    if (status === "read") $set.readAt = now;
    if (status === "replied") $set.repliedAt = now;

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);
    const res = await db.collection("contact_messages").updateMany(
      { _id: { $in: objectIds } },
      { $set }
    );

    return NextResponse.json({ ok: true, modified: res.modifiedCount });
  } catch (e) {
    console.error("/api/admin/contact-messages PATCH", e);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const ids: string[] = Array.isArray((body as any)?.ids) ? (body as any).ids : [];
    const objectIds = ids.filter(id => ObjectId.isValid(id)).map(id => new ObjectId(id));
    if (objectIds.length === 0) return NextResponse.json({ error: "MISSING_IDS" }, { status: 400 });

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);
    const res = await db.collection("contact_messages").deleteMany({ _id: { $in: objectIds } });

    return NextResponse.json({ ok: true, deleted: res.deletedCount });
  } catch (e) {
    console.error("/api/admin/contact-messages DELETE", e);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}