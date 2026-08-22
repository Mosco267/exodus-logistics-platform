// src/app/api/admin/status-incident/route.ts
import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { auth } from "@/auth";

const DOC_ID = "status_incident" as const;
const SEVERITIES = ["investigating", "identified", "monitoring", "maintenance"] as const;

async function requireAdmin() {
  const session = await auth();
  return String((session as any)?.user?.role || "").toUpperCase() === "ADMIN";
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);
    const doc: any = await db.collection("app_settings").findOne({ _id: DOC_ID as any });
    return NextResponse.json({
      ok: true,
      incident: {
        active: Boolean(doc?.active),
        severity: String(doc?.severity || "investigating"),
        title: String(doc?.title || ""),
        body: String(doc?.body || ""),
        startedAt: doc?.startedAt ? new Date(doc.startedAt).toISOString() : null,
      },
    });
  } catch {
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const body = await req.json().catch(() => ({}));
    const active = Boolean((body as any)?.active);
    const severity = SEVERITIES.includes((body as any)?.severity)
      ? String((body as any).severity)
      : "investigating";

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    const existing: any = await db.collection("app_settings").findOne({ _id: DOC_ID as any });

    const update: any = {
      active,
      severity,
      title: String((body as any)?.title || "").trim().slice(0, 200),
      body: String((body as any)?.body || "").trim().slice(0, 1000),
      updatedAt: new Date(),
    };

    /* startedAt is set when an incident opens and preserved while it
       stays open, so the public page can show how long it has run. */
    if (active && !existing?.active) update.startedAt = new Date();
    if (!active) update.startedAt = null;

    await db.collection("app_settings").updateOne(
      { _id: DOC_ID as any },
      { $set: update, $setOnInsert: { _id: DOC_ID } },
      { upsert: true }
    );

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}