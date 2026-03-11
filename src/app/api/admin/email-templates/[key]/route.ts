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

    const doc = await db.collection("email_templates").findOne(
      { key: String(key).trim() },
      { projection: { _id: 0 } }
    );

    if (!doc) {
      return NextResponse.json({ error: "Template not found." }, { status: 404 });
    }

    return NextResponse.json({ template: doc });
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

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    await db.collection("email_templates").deleteOne({
      key: String(key).trim(),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}