import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { auth } from "@/auth";

export async function POST() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB);

  await db.collection("users").updateOne(
    { email: (session.user.email || '').toLowerCase() },
    { $set: { hasVisitedDashboard: true } }
  );

  return NextResponse.json({ ok: true });
}