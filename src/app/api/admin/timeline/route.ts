import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

const normalizeKey = (v: string) =>
  (v ?? "").toLowerCase().trim().replace(/[\s_-]+/g, "");

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    const docs = await db
      .collection("statuses")
      .find({})
      .project({ _id: 0 })
      .sort({ label: 1 })
      .toArray();

    return NextResponse.json({ stages: docs });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const label = String(body.label || "").trim();
    const key = normalizeKey(body.key || label);
    const color = String(body.color || "blue").trim();
    const icon = String(body.icon || "Package").trim();
    const defaultUpdate = String(body.defaultUpdate || "").trim();
    const nextStep = String(body.nextStep || "").trim();

    const emailSubject = String(body.emailSubject || "").trim();
    const emailTitle = String(body.emailTitle || "").trim();
    const emailBodyHtml = String(body.emailBodyHtml || "").trim();
    const emailButtonText = String(body.emailButtonText || "Track Shipment").trim();
    const emailButtonHref = String(body.emailButtonHref || "{{trackUrl}}").trim();

    if (!label) {
      return NextResponse.json({ error: "Label is required." }, { status: 400 });
    }

    if (!emailSubject || !emailTitle || !emailBodyHtml) {
      return NextResponse.json(
        { error: "Email subject, title, and body are required." },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);
    const now = new Date();

    const stageDoc = {
      key,
      label,
      color,
      icon,
      defaultUpdate,
      nextStep,
      updatedAt: now,
    };

    await db.collection("statuses").updateOne(
      { key },
      {
        $set: stageDoc,
        $setOnInsert: { createdAt: now },
      },
      { upsert: true }
    );

    await db.collection("email_templates").updateOne(
      { key: `timeline:${key}` },
      {
        $set: {
          key: `timeline:${key}`,
          name: `${label} email`,
          category: "timeline",
          subject: emailSubject,
          title: emailTitle,
          preheader: `${label} update`,
          bodyHtml: emailBodyHtml,
          buttonText: emailButtonText,
          buttonHref: emailButtonHref,
          updatedAt: now,
        },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true }
    );

    return NextResponse.json({ ok: true, stage: stageDoc });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}