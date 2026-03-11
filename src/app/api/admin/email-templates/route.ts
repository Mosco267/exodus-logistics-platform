import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    const docs = await db
      .collection("email_templates")
      .find({})
      .project({ _id: 0 })
      .sort({ key: 1 })
      .toArray();

    return NextResponse.json({ templates: docs });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const key = String(body.key || "").trim();
    const name = String(body.name || "").trim();
    const subject = String(body.subject || "").trim();
    const title = String(body.title || "").trim();
    const preheader = String(body.preheader || "").trim();
    const bodyHtml = String(body.bodyHtml || "").trim();
    const buttonText = String(body.buttonText || "").trim();
    const buttonHref = String(body.buttonHref || "").trim();
    const category = String(body.category || "general").trim();

    if (!key) {
      return NextResponse.json({ error: "Template key is required." }, { status: 400 });
    }

    if (!name) {
      return NextResponse.json({ error: "Template name is required." }, { status: 400 });
    }

    if (!subject || !title || !bodyHtml) {
      return NextResponse.json(
        { error: "Subject, title, and bodyHtml are required." },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);
    const now = new Date();

    const doc = {
      key,
      name,
      category,
      subject,
      title,
      preheader,
      bodyHtml,
      buttonText,
      buttonHref,
      updatedAt: now,
    };

    await db.collection("email_templates").updateOne(
      { key },
      {
        $set: doc,
        $setOnInsert: { createdAt: now },
      },
      { upsert: true }
    );

    return NextResponse.json({ ok: true, template: doc });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}