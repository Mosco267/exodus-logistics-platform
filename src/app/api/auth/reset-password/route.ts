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

   const user = await db.collection("users").findOne({ email: email.toLowerCase().trim() });
if (!user) return NextResponse.json({ error: "Account not found." }, { status: 404 });

// Check current password
if (user.passwordHash) {
  const isSame = await bcrypt.compare(password, user.passwordHash);
  if (isSame) {
    return NextResponse.json({
      error: "This password has been used before. Please choose a different password."
    }, { status: 400 });
  }
}

// Check password history (last 10 passwords)
const history: string[] = user.passwordHistory || [];
for (const oldHash of history) {
  const isOld = await bcrypt.compare(password, oldHash);
  if (isOld) {
    return NextResponse.json({
      error: "This password has been used before. Please choose a different password."
    }, { status: 400 });
  }
}

const passwordHash = await bcrypt.hash(password, 12);

// Keep last 10 passwords in history
const updatedHistory = [user.passwordHash, ...history].filter(Boolean).slice(0, 10);

await db.collection("users").updateOne(
  { email: email.toLowerCase().trim() },
  {
    $set: {
      passwordHash,
      passwordHistory: updatedHistory,
    }
  }
);

await db.collection("password_resets").deleteMany({ email });

return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}