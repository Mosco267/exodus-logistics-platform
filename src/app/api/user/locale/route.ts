import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { auth } from "@/auth";

const SUPPORTED = ["en","es","fr","de","zh","it","ar","pt","ru","ja","ko","hi"];

export async function PATCH(req: Request) {
  try {
    const session = await auth();
    const email = String((session?.user as any)?.email || "").toLowerCase().trim();
    if (!email) return NextResponse.json({ ok: false }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const locale = String((body as any)?.locale || "").toLowerCase().trim();
    if (!SUPPORTED.includes(locale)) {
      return NextResponse.json({ ok: false, error: "Unsupported locale" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);
    await db.collection("users").updateOne(
      { email },
      { $set: { preferredLocale: locale, updatedAt: new Date() } }
    );

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}