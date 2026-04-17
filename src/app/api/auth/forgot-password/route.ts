// ============================================================
// FILE 5: src/app/api/auth/forgot-password/route.ts
// ============================================================
import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { Resend } from "resend";
import crypto from "crypto";
import { renderEmailTemplate } from "@/lib/emailTemplate";

const resend = new Resend(process.env.RESEND_API_KEY);
const APP_URL = (process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "https://www.goexoduslogistics.com").replace(/\/$/, "");
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || "support@goexoduslogistics.com";
const RESEND_FROM = process.env.RESEND_FROM || `Exodus Logistics <${SUPPORT_EMAIL}>`;
const FONT = `-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif`;

export async function POST(req: Request) {
  let email = "";
  try {
    const body = await req.json();
    email = String(body.email || "").toLowerCase().trim();
    if (!email) return NextResponse.json({ error: "Email is required." }, { status: 400 });

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    const user = await db.collection("users").findOne({ email });
    if (!user) return NextResponse.json({ error: "No account found with this email address." }, { status: 404 });

    const blocked = await db.collection("blocked_emails").findOne({ email });
    if (blocked) return NextResponse.json({ error: "This account has been suspended. Contact support to resolve this." }, { status: 403 });

    const token = crypto.randomBytes(32).toString("hex");
    const expiry = new Date(Date.now() + 60 * 60 * 1000);

    await db.collection("password_resets").deleteMany({ email });
    await db.collection("password_resets").insertOne({ email, token, expiry, createdAt: new Date() });

    const resetUrl = `${APP_URL}/en/reset-password?token=${token}&email=${encodeURIComponent(email)}`;

    const bodyHtml = `
      <p style="margin:0 0 16px 0;font-size:16px;line-height:26px;color:#111827;font-family:${FONT};">
        Hi <strong style="color:#111827;">${user.name || "there"}</strong>,
      </p>
      <p style="margin:0 0 14px 0;font-size:16px;line-height:26px;color:#111827;font-family:${FONT};">
        We received a request to reset the password for your Exodus Logistics account.
        Click the button below to create a new password. This link expires in
        <strong style="color:#ef4444;">1 hour</strong>.
      </p>

      <div style="background:#fff7ed;border-radius:12px;padding:20px 24px;margin-bottom:20px;border-left:4px solid #f97316;">
        <p style="margin:0 0 10px 0;font-size:13px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:1px;font-family:${FONT};">Security Notice</p>
        <p style="margin:0 0 6px 0;font-size:13px;color:#78350f;font-family:${FONT};">&#x2713;&nbsp; This link expires in 1 hour and can only be used once</p>
        <p style="margin:0 0 6px 0;font-size:13px;color:#78350f;font-family:${FONT};">&#x2713;&nbsp; Never share this link with anyone, including Exodus Logistics staff</p>
        <p style="margin:0;font-size:13px;color:#78350f;font-family:${FONT};">&#x2713;&nbsp; If you are concerned, contact us at <a href="mailto:${SUPPORT_EMAIL}" style="color:#1d4ed8;text-decoration:none;font-weight:600;">${SUPPORT_EMAIL}</a></p>
      </div>

      <p style="margin:0 0 6px 0;font-size:15px;line-height:24px;color:#6b7280;font-family:${FONT};">
        If you did not request this, you can safely ignore this email. Your account remains secure.
      </p>
      <p style="margin:20px 0 6px 0;font-size:13px;color:#9ca3af;text-align:center;font-family:${FONT};">
        If the button below does not work, copy and paste this link into your browser:
      </p>
      <p style="margin:0;font-size:12px;color:#1d4ed8;text-align:center;word-break:break-all;font-family:${FONT};">
        ${resetUrl}
      </p>
    `;

    const html = renderEmailTemplate({
      subject: "Reset your Exodus Logistics password",
      title: "Password Reset Request",
      preheader: `Hi ${user.name || "there"}, here is your password reset link for Exodus Logistics.`,
      bodyHtml,
      button: { text: "Reset My Password", href: resetUrl },
      appUrl: APP_URL,
      supportEmail: SUPPORT_EMAIL,
      sentTo: email,
    });

    await resend.emails.send({
      from: RESEND_FROM, replyTo: SUPPORT_EMAIL, to: email,
      subject: "Reset your Exodus Logistics password",
      html,
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("Forgot password error:", e);
    return NextResponse.json({ error: "No account found with this email address." }, { status: 404 });
  }
}