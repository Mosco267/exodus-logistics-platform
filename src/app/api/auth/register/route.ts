import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import clientPromise from "@/lib/mongodb";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const name = String(body.name || "").trim();
    const email = String(body.email || "").toLowerCase().trim();
    const password = String(body.password || "");

    // Validation
    if (!name) return NextResponse.json({ error: "Full name is required." }, { status: 400 });
    if (!email || !/^\S+@\S+\.\S+$/.test(email))
      return NextResponse.json({ error: "A valid email address is required." }, { status: 400 });
    if (!password || password.length < 8)
      return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    // Check blocked emails
    const blocked = await db.collection("blocked_emails").findOne({ email });
    if (blocked)
      return NextResponse.json({ error: "This email address is not eligible for registration." }, { status: 403 });

    // Check existing user
    const existing = await db.collection("users").findOne({ email });
    if (existing)
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    await db.collection("users").insertOne({
      name,
      email,
      passwordHash,
      role: "USER",
      provider: "credentials",
      createdAt: new Date(),
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e?.message || "Server error." }, { status: 500 });
  }
}