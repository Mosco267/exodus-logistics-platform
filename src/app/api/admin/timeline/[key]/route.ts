import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET(
  _req: Request,
  context: { params: Promise<{ key: string }> }
) {
  try {
    const { key } = await context.params;

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    const stage = await db.collection("statuses").findOne(
      { key: String(key).trim() },
      { projection: { _id: 0 } }
    );

    const emailTemplate = await db.collection("email_templates").findOne(
      { key: `timeline:${String(key).trim()}` },
      { projection: { _id: 0 } }
    );

    if (!stage) {
      return NextResponse.json({ error: "Stage not found." }, { status: 404 });
    }

    return NextResponse.json({ stage, emailTemplate });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ key: string }> }
) {
  try {
    const { key } = await context.params;

    const k = String(key).trim();

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    await db.collection("statuses").deleteOne({ key: k });
    await db.collection("email_templates").deleteOne({ key: `timeline:${k}` });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}