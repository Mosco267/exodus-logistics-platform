import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { email, token, password } = await req.json();

    if (!email || !token || !password)
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });

    if (password.length < 8 ||
        !/[A-Z]/.test(password) ||
        !/[0-9]/.test(password) ||
        !/[^A-Za-z0-9]/.test(password))
      return NextResponse.json({ error: "Password must meet all requirements." }, { status: 400 });

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    const reset = await db.collection("password_resets").findOne({
      email: email.toLowerCase().trim(),
      token,
    });

    if (!reset)
      return NextResponse.json({ error: "Invalid or expired reset link." }, { status: 400 });

    if (new Date() > new Date(reset.expiry))
      return NextResponse.json({ error: "This reset link has expired. Please request a new one." }, { status: 400 });

    const passwordHash = await bcrypt.hash(password, 12);

    await db.collection("users").updateOne(
      { email: email.toLowerCase().trim() },
      { $set: { passwordHash } }
    );

    await db.collection("password_resets").deleteMany({ email });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}