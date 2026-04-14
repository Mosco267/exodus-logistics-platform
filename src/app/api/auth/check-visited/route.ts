import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { auth } from "@/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB);

  const user = await db.collection("users").findOne(
    { email: (session.user.email || '').toLowerCase() },
    { projection: { hasVisitedDashboard: 1 } }
  );

  return NextResponse.json({ hasVisited: !!user?.hasVisitedDashboard });
}