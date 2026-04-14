import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { auth } from "@/auth";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { theme } = await req.json();
  if (!theme) return NextResponse.json({ error: "Theme required" }, { status: 400 });

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB);

  await db.collection("users").updateOne(
    { email: (session.user.email || '').toLowerCase() },
    { $set: { dashboardTheme: theme } }
  );

  return NextResponse.json({ ok: true });
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB);

  const user = await db.collection("users").findOne(
    { email: (session.user.email || '').toLowerCase() },
    { projection: { dashboardTheme: 1 } }
  );

  return NextResponse.json({ theme: user?.dashboardTheme || 'default' });
}