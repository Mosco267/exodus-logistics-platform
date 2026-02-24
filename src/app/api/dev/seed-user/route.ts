import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import clientPromise from "@/lib/mongodb";

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);

    const email = String(url.searchParams.get("email") || "").toLowerCase().trim();
    const password = String(url.searchParams.get("password") || "Password123");
    const name = String(url.searchParams.get("name") || "Test User");
    const role = String(url.searchParams.get("role") || "USER").toUpperCase();
    const force = String(url.searchParams.get("force") || "0") === "1";

    if (!email || !email.includes("@")) {
      return NextResponse.json({ ok: false, error: "Invalid email" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    // ✅ Blocked emails check
    const blocked = await db.collection("blocked_emails").findOne({ email });
    if (blocked) {
      return NextResponse.json({ ok: false, error: "Email is blocked", email }, { status: 403 });
    }

    const existing = await db.collection("users").findOne({ email });

    const passwordHash = await bcrypt.hash(password, 10);

    if (existing) {
      if (!force) {
        return NextResponse.json(
          { ok: true, message: "User already exists (use force=1 to reset password)", email },
          { status: 200 }
        );
      }

      await db.collection("users").updateOne(
        { email },
        {
          $set: {
            name,
            role,
            passwordHash,
            updatedAt: new Date(),
          },
        }
      );

      return NextResponse.json({
        ok: true,
        message: "User updated (password reset)",
        email,
        password,
        role,
        name,
      });
    }

    await db.collection("users").insertOne({
      email,
      name,
      role,
      passwordHash,
      createdAt: new Date(),
    });

    return NextResponse.json({ ok: true, message: "User created", email, password, role, name });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}