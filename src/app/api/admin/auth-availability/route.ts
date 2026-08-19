// src/app/api/admin/auth-availability/route.ts
import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { auth } from "@/auth";

const DOC_ID = "auth" as const;

async function requireAdmin() {
  const session = await auth();
  const role = String((session as any)?.user?.role || "").toUpperCase();
  return role === "ADMIN";
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
      settings: {
        signInDisabled: Boolean(doc?.signInDisabled),
        signUpDisabled: Boolean(doc?.signUpDisabled),
        message: String(doc?.message || ""),
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
    const update = {
      signInDisabled: Boolean((body as any)?.signInDisabled),
      signUpDisabled: Boolean((body as any)?.signUpDisabled),
      message: String((body as any)?.message || "").trim().slice(0, 300),
      updatedAt: new Date(),
    };

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);
    await db.collection("app_settings").updateOne(
      { _id: DOC_ID as any },
      { $set: update, $setOnInsert: { _id: DOC_ID } },
      { upsert: true }
    );

    return NextResponse.json({ ok: true, settings: update });
  } catch {
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}