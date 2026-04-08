import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { Resend } from "resend";
import crypto from "crypto";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: "Email is required." }, { status: 400 });

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    const user = await db.collection("users").findOne({ email: email.toLowerCase().trim() });

    // Always return success even if user not found (security best practice)
    if (!user) return NextResponse.json({ ok: true });

    // Generate secure token
    const token = crypto.randomBytes(32).toString("hex");
    const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await db.collection("password_resets").deleteMany({ email });
    await db.collection("password_resets").insertOne({
      email: email.toLowerCase().trim(),
      token,
      expiry,
      createdAt: new Date(),
    });

    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/en/reset-password?token=${token}&email=${encodeURIComponent(email.toLowerCase().trim())}`;

    await resend.emails.send({
      from: "Exodus Logistics <noreply@goexoduslogistics.com>",
      replyTo: "support@goexoduslogistics.com",
      to: email,
      subject: "Reset your Exodus Logistics password",
      html: `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f0f4ff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4ff;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:540px;">
        <tr><td style="background:linear-gradient(135deg,#1d4ed8 0%,#0891b2 100%);border-radius:20px 20px 0 0;padding:36px 40px;text-align:center;">
          <img src="https://goexoduslogistics.com/logo-email.svg" alt="Exodus Logistics" style="height:48px;width:auto;display:block;margin:0 auto;" />
        </td></tr>
        <tr><td style="background:#ffffff;padding:40px;">
          <h1 style="margin:0 0 6px;font-size:26px;font-weight:800;color:#111827;">Password Reset Request</h1>
          <p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.7;">
            Hi <strong style="color:#111827;">${user.name || 'there'}</strong>,<br/>
            We received a request to reset the password associated with your Exodus Logistics account. If you made this request, click the button below to proceed. This link is valid for <strong style="color:#111827;">1 hour</strong>.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
            <tr><td align="center">
              <a href="${resetUrl}"
                style="display:inline-block;background:linear-gradient(135deg,#1d4ed8 0%,#0891b2 100%);color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:16px 48px;border-radius:12px;letter-spacing:0.5px;">
                Reset My Password
              </a>
            </td></tr>
          </table>
          <div style="background:#f8fafc;border-radius:12px;padding:20px 24px;margin-bottom:24px;border-left:4px solid #1d4ed8;">
            <p style="margin:0 0 10px;font-size:13px;font-weight:700;color:#111827;text-transform:uppercase;letter-spacing:1px;">What happens next</p>
            <p style="margin:0 0 6px;font-size:13px;color:#6b7280;">Click the button above to be taken to a secure page where you can create a new password.</p>
            <p style="margin:0 0 6px;font-size:13px;color:#6b7280;">Once reset, you can sign in immediately with your new password.</p>
            <p style="margin:0;font-size:13px;color:#6b7280;">Your previous password will no longer work.</p>
          </div>
          <div style="background:#fff7ed;border-radius:12px;padding:20px 24px;margin-bottom:24px;border-left:4px solid #f97316;">
            <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:1px;">Did not request this?</p>
            <p style="margin:0 0 6px;font-size:13px;color:#78350f;">If you did not request a password reset, no action is required. Your account remains secure and your password has not been changed.</p>
            <p style="margin:0;font-size:13px;color:#78350f;">However, if you are concerned about your account security, please contact us immediately.</p>
          </div>
          <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
            If the button above does not work, copy and paste this link into your browser:<br/>
            <span style="color:#1d4ed8;word-break:break-all;font-size:11px;">${resetUrl}</span>
          </p>
        </td></tr>
        <tr><td style="background:#1e293b;padding:28px 40px;text-align:center;border-radius:0 0 20px 20px;">
          <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#ffffff;">Exodus Logistics Ltd.</p>
          <p style="margin:0 0 10px;font-size:12px;color:rgba(255,255,255,0.5);">Your trusted global shipping partner</p>
          <p style="margin:0 0 8px;font-size:11px;color:rgba(255,255,255,0.3);">© ${new Date().getFullYear()} Exodus Logistics Ltd. All rights reserved.</p>
          <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.2);">This email was sent to ${email} because a password reset was requested for this account.</p>
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
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}