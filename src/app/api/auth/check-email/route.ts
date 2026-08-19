import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    const lcEmail = String(email || "").toLowerCase().trim();
    if (!lcEmail) return NextResponse.json({ status: "available" });

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    const banned = await db.collection("banned_emails").findOne({ email: lcEmail });
    if (banned) return NextResponse.json({ status: "banned" });

    const deleted = await db.collection("deleted_users").findOne({ email: lcEmail });
    if (deleted) return NextResponse.json({ status: "deleted", name: deleted.name || '' });

       const existing = await db.collection("users").findOne({ email: lcEmail });
    if (existing) return NextResponse.json({ status: "exists" });

    /* Unknown address, and registration is paused. Returned as its own
       status so the sign-in page can show the notice rather than sending
       the visitor into a sign-up flow that cannot complete. */
    const authSettings: any = await db.collection("app_settings").findOne({ _id: "auth" as any });
    if (authSettings?.signUpDisabled) {
      return NextResponse.json({ status: "signup_disabled" });
    }

    return NextResponse.json({ status: "available" });
  } catch {
    return NextResponse.json({ status: "available" });
  }
}