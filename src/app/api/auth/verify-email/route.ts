import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { sendWelcomeEmail } from "@/lib/sendWelcomeEmail";

export async function POST(req: Request) {
  try {
    const { email, code } = await req.json();

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    // Check if already a verified user
    const existingUser = await db.collection("users").findOne({ email });
    if (existingUser?.emailVerified) return NextResponse.json({ ok: true });

    // Find in pending collection
    const pending = await db.collection("pending_users").findOne({ email });
    if (!pending) return NextResponse.json({ error: "No pending registration found. Please sign up again." }, { status: 404 });

    if (!pending.verificationCode || pending.verificationCode !== code)
      return NextResponse.json({ error: "Invalid code. Please check and try again." }, { status: 400 });

    if (new Date() > new Date(pending.verificationExpiry))
      return NextResponse.json({ error: "This code has expired. Please request a new one." }, { status: 400 });

    // Now create the real user
    await db.collection("users").insertOne({
  name: pending.name,
  email: pending.email,
  passwordHash: pending.passwordHash,
  phone: pending.phone || '',
  country: pending.country || '',
  role: pending.role,
  provider: pending.provider,
  emailVerified: true,
  avatarUrl: '',
  hasVisitedDashboard: false,
  createdAt: pending.createdAt,
});

    // Remove from pending
    await db.collection("pending_users").deleteMany({ email });

    // Send welcome email
    try {
      await sendWelcomeEmail(pending.name, email);
    } catch (e) {
      console.error("Welcome email failed:", e);
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e?.message || "Server error." }, { status: 500 });
  }
}