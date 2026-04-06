import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function POST(req: Request) {
  try {
    const { email, code } = await req.json();

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    const user = await db.collection("users").findOne({ email });
    if (!user) return NextResponse.json({ error: "Account not found." }, { status: 404 });

    if (user.emailVerified) return NextResponse.json({ ok: true });

    if (!user.verificationCode || user.verificationCode !== code)
      return NextResponse.json({ error: "Invalid code. Please check and try again." }, { status: 400 });

    if (new Date() > new Date(user.verificationExpiry))
      return NextResponse.json({ error: "This code has expired. Please request a new one." }, { status: 400 });

    await db.collection("users").updateOne(
      { email },
      { $set: { emailVerified: true, verificationCode: null, verificationExpiry: null } }
    );

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e?.message || "Server error." }, { status: 500 });
  }
}