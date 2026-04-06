import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { Resend } from "resend";
import crypto from "crypto";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    const user = await db.collection("users").findOne({ email });
    if (!user) return NextResponse.json({ error: "Account not found." }, { status: 404 });

    const verificationCode = crypto.randomInt(100000, 999999).toString();
    const verificationExpiry = new Date(Date.now() + 10 * 60 * 1000);

    await db.collection("users").updateOne(
      { email },
      { $set: { verificationCode, verificationExpiry } }
    );

    await resend.emails.send({
      from: "Exodus Logistics <noreply@goexoduslogistics.com>",
      to: email,
      subject: "Your new verification code — Exodus Logistics",
      html: `
        
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f0f4ff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4ff;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:540px;">

        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#1d4ed8 0%,#0891b2 100%);border-radius:20px 20px 0 0;padding:36px 40px;text-align:center;">
          <img src="https://goexoduslogistics.com/logo-email.svg" alt="Exodus Logistics" style="height:48px;width:auto;display:block;margin:0 auto;" />
        </td></tr>

        <!-- Body -->
        <tr><td style="background:#ffffff;padding:40px;">
          <h1 style="margin:0 0 6px;font-size:26px;font-weight:800;color:#111827;">New verification code</h1>
          <p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.7;">
            You requested a new verification code for your Exodus Logistics account.<br/>
            Use the code below to complete your email verification. This code is valid for <strong style="color:#111827;">10 minutes</strong>.
          </p>

          <!-- Code box -->
          <div style="background:linear-gradient(135deg,#f0f4ff,#e8f4ff);border-radius:16px;padding:32px;text-align:center;margin-bottom:28px;border:1px solid #e0e8ff;">
            <p style="margin:0 0 8px;font-size:11px;font-weight:700;color:#6b7280;letter-spacing:3px;text-transform:uppercase;">Your new verification code</p>
            <p style="margin:0 0 8px;font-size:52px;font-weight:900;letter-spacing:14px;color:#1d4ed8;font-family:'Courier New',monospace;">${verificationCode}</p>
            <p style="margin:0;font-size:13px;color:#9ca3af;">Expires in <strong style="color:#ef4444;">10 minutes</strong></p>
          </div>

          <!-- Security note -->
          <div style="background:#fff7ed;border-radius:12px;padding:20px 24px;margin-bottom:24px;border-left:4px solid #f97316;">
            <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:1px;">Security reminder</p>
            <p style="margin:0 0 6px;font-size:13px;color:#78350f;">Never share this code with anyone, including Exodus Logistics staff.</p>
            <p style="margin:0 0 6px;font-size:13px;color:#78350f;">This code is single-use and expires in 10 minutes.</p>
            <p style="margin:0;font-size:13px;color:#78350f;">If you didn't request this, please secure your account immediately.</p>
          </div>

          <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">Having trouble? Contact us at <a href="mailto:support@goexoduslogistics.com" style="color:#1d4ed8;text-decoration:none;font-weight:600;">support@goexoduslogistics.com</a></p>
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