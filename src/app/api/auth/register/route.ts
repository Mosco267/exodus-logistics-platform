import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import clientPromise from "@/lib/mongodb";
import { Resend } from "resend";
import crypto from "crypto";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const name = String(body.name || "").trim();
    const email = String(body.email || "").toLowerCase().trim();
    const password = String(body.password || "");

    if (!name) return NextResponse.json({ error: "Full name is required." }, { status: 400 });
    if (!email || !/^\S+@\S+\.\S+$/.test(email))
      return NextResponse.json({ error: "A valid email address is required." }, { status: 400 });
    if (!password || password.length < 8)
      return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    const blocked = await db.collection("blocked_emails").findOne({ email });
    if (blocked)
      return NextResponse.json({ error: "This email address is not eligible for registration." }, { status: 403 });

    const existing = await db.collection("users").findOne({ email });
    if (existing)
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });

    const passwordHash = await bcrypt.hash(password, 12);

    // Generate 6-digit code
    const verificationCode = crypto.randomInt(100000, 999999).toString();
    const verificationExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    // Save to pending collection, NOT users yet
await db.collection("pending_users").deleteMany({ email }); // clear old pending
await db.collection("pending_users").insertOne({
  name,
  email,
  passwordHash,
  role: "USER",
  provider: "credentials",
  verificationCode,
  verificationExpiry,
  createdAt: new Date(),
});

    // Send verification email
    await resend.emails.send({
      from: "Exodus Logistics <noreply@goexoduslogistics.com>",
      to: email,
      subject: "Verify your Exodus Logistics account",
      html: `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f0f4ff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4ff;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:540px;">

        <!-- Header with gradient -->
        <tr><td style="background:linear-gradient(135deg,#1d4ed8 0%,#0891b2 100%);border-radius:20px 20px 0 0;padding:36px 40px;text-align:center;">
          <img src="https://goexoduslogistics.com/logo-email.svg" alt="Exodus Logistics" style="height:48px;width:auto;display:block;margin:0 auto;" />
        </td></tr>

        <!-- Body -->
        <tr><td style="background:#ffffff;padding:40px;">
          <h1 style="margin:0 0 6px;font-size:26px;font-weight:800;color:#111827;">Welcome to Exodus Logistics!</h1>
          <p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.7;">
            Hi <strong style="color:#111827;">${name}</strong>, thank you for signing up with Exodus Logistics<br/>
            Please enter the verification code below to complete your registration and activate your account. This code will expire in <strong style="color:#ef4444;">10 minutes</strong>.
          </p>

          <!-- Code box -->
          <div style="background:linear-gradient(135deg,#f0f4ff,#e8f4ff);border-radius:16px;padding:32px;text-align:center;margin-bottom:28px;border:1px solid #e0e8ff;">
            <p style="margin:0 0 8px;font-size:11px;font-weight:700;color:#6b7280;letter-spacing:3px;text-transform:uppercase;">Your verification code</p>
            <p style="margin:0 0 8px;font-size:52px;font-weight:900;letter-spacing:14px;color:#1d4ed8;font-family:'Courier New',monospace;">${verificationCode}</p>
            <p style="margin:0;font-size:13px;color:#9ca3af;">Expires in <strong style="color:#ef4444;">10 minutes</strong></p>
          </div>

          <!-- What's next -->
          <div style="background:#f8fafc;border-radius:12px;padding:20px 24px;margin-bottom:24px;border-left:4px solid #1d4ed8;">
            <p style="margin:0 0 10px;font-size:13px;font-weight:700;color:#111827;text-transform:uppercase;letter-spacing:1px;">What you can do with Exodus Logistics:</p>
            <p style="margin:0 0 6px;font-size:13px;color:#6b7280;">Track shipments in real time across 120+ countries</p>
            <p style="margin:0 0 6px;font-size:13px;color:#6b7280;">Generate and manage invoices automatically</p>
            <p style="margin:0;font-size:13px;color:#6b7280;">Access our global logistics network instantly</p>
          </div>

          <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">If you didn't create this account, you can safely ignore this email. No action is needed.</p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#1e293b;padding:24px 40px;text-align:center;border-radius:0 0 20px 20px;">
          <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#ffffff;">Exodus Logistics Ltd.</p>
          <p style="margin:0 0 10px;font-size:12px;color:rgba(255,255,255,0.5);">Your trusted global shipping partner</p>
          <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.3);">© ${new Date().getFullYear()} Exodus Logistics Ltd. All rights reserved.</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
`,
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e?.message || "Server error." }, { status: 500 });
  }
}