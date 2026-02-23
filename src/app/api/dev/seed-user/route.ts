import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import clientPromise from "@/lib/mongodb";

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);

    const email = String(url.searchParams.get("email") || "user2@example.com")
      .toLowerCase()
      .trim();

    const password = String(url.searchParams.get("password") || "Password123");
    const name = String(url.searchParams.get("name") || "Test User 2");

    if (!email || !email.includes("@")) {
      return NextResponse.json({ ok: false, error: "Invalid email" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    // ✅ Blocked emails check (prevents re-creating deleted users)
    const blocked = await db.collection("blocked_emails").findOne({ email });
    if (blocked) {
      return NextResponse.json(
        { ok: false, error: "Email is blocked", email },
        { status: 403 }
      );
    }

    const existing = await db.collection("users").findOne({ email });
    if (existing) {
      return NextResponse.json(
        { ok: true, message: "User already exists", email },
        { status: 200 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await db.collection("users").insertOne({
      email,
      name,
      passwordHash,
      role: "USER",
      createdAt: new Date(),
    });

    return NextResponse.json({ ok: true, email, password, name });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}