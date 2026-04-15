import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { auth } from "@/auth";
import crypto from "crypto";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { newEmail } = await req.json();
  if (!newEmail || !/^\S+@\S+\.\S+$/.test(newEmail))
    return NextResponse.json({ error: "Invalid email address" }, { status: 400 });

  const normalizedNew = newEmail.toLowerCase().trim();
  const currentEmail = (session.user.email || '').toLowerCase();

  if (normalizedNew === currentEmail)
    return NextResponse.json({ error: "This is already your current email" }, { status: 400 });

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB);

  // Check if new email already taken
  const existing = await db.collection("users").findOne({ email: normalizedNew });
  if (existing) return NextResponse.json({ error: "This email is already in use" }, { status: 409 });

  // Generate 6-digit code
  const code = crypto.randomInt(100000, 999999).toString();
  const expiry = new Date(Date.now() + 10 * 60 * 1000);

  // Save code to user
  await db.collection("users").updateOne(
    { email: currentEmail },
    { $set: { emailChangeCode: code, emailChangeExpiry: expiry, emailChangePending: normalizedNew } }
  );

  // Send code to NEW email
  await resend.emails.send({
    from: process.env.RESEND_FROM || "Exodus Logistics <noreply@goexoduslogistics.com>",
    to: normalizedNew,
    subject: "Verify your new email address",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:40px 24px;">
        <h2 style="font-size:22px;font-weight:800;color:#111827;margin:0 0 8px;">Verify your new email</h2>
        <p style="color:#6b7280;font-size:15px;line-height:1.6;margin:0 0 24px;">
          Enter this code in the Exodus Logistics app to confirm your new email address.
        </p>
        <div style="background:#f0f4ff;border-radius:16px;padding:28px;text-align:center;margin-bottom:24px;">
          <p style="margin:0 0 8px;font-size:11px;font-weight:700;color:#6b7280;letter-spacing:3px;text-transform:uppercase;">Verification Code</p>
          <p style="margin:0;font-size:48px;font-weight:900;letter-spacing:12px;color:#1d4ed8;font-family:monospace;">${code}</p>
          <p style="margin:8px 0 0;font-size:13px;color:#9ca3af;">Expires in <strong style="color:#ef4444;">10 minutes</strong></p>
        </div>
        <p style="color:#9ca3af;font-size:12px;text-align:center;">If you did not request this change, ignore this email.</p>
      </div>
    `,
  });

  return NextResponse.json({ ok: true });
}