import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import clientPromise from "@/lib/mongodb";
import { auth } from "@/auth";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { currentPassword, newPassword } = await req.json();
  if (!currentPassword || !newPassword)
    return NextResponse.json({ error: "All fields are required" }, { status: 400 });
  if (newPassword.length < 8)
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB);
  const user = await db.collection("users").findOne({ email: (session.user.email || '').toLowerCase() });

  if (!user?.passwordHash)
    return NextResponse.json({ error: "Cannot change password for this account type" }, { status: 400 });

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });

  // Check password history (last 5)
  const history: string[] = user.passwordHistory || [];
  for (const oldHash of history) {
    if (await bcrypt.compare(newPassword, oldHash)) {
      return NextResponse.json({ error: "You have used this password recently. Please choose a different password." }, { status: 400 });
    }
  }

  const newHash = await bcrypt.hash(newPassword, 12);
  const updatedHistory = [user.passwordHash, ...history].slice(0, 5);

  await db.collection("users").updateOne(
    { email: (session.user.email || '').toLowerCase() },
    { $set: { passwordHash: newHash, passwordHistory: updatedHistory } }
  );

  return NextResponse.json({ ok: true });
}