// ============================================================
// FILE 3: src/app/api/auth/resend-verification/route.ts
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
  try {
    const { email } = await req.json();
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    const user = await db.collection("pending_users").findOne({ email });
    if (!user) return NextResponse.json({ error: "No pending registration found. Please sign up again." }, { status: 404 });

    const verificationCode = crypto.randomInt(100000, 999999).toString();
    const verificationExpiry = new Date(Date.now() + 10 * 60 * 1000);

    await db.collection("pending_users").updateOne({ email }, { $set: { verificationCode, verificationExpiry } });

    const codeBoxesHtml = verificationCode.split("").map(digit => `
      <td class="code-cell" style="padding:0 5px;">
        <div class="code-box" style="width:46px;height:56px;background:#f0f4ff;border:2px solid #e0e8ff;border-radius:12px;text-align:center;line-height:56px;font-size:28px;font-weight:900;color:#1d4ed8;font-family:'Courier New',Courier,monospace;">${digit}</div>
      </td>
    `).join("");

    const bodyHtml = `
      <p style="margin:0 0 16px 0;font-size:16px;line-height:26px;color:#111827;font-family:${FONT};">
        Hi <strong style="color:#111827;">${user.name || "there"}</strong>,
      </p>
      <p style="margin:0 0 14px 0;font-size:16px;line-height:26px;color:#111827;font-family:${FONT};">
        You requested a new verification code for your Exodus Logistics account.
        Use the code below to complete your email verification.
        This code is valid for <strong style="color:#ef4444;">10 minutes</strong>.
      </p>

      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:20px;">
        <tr>
          <td style="background:linear-gradient(135deg,#f0f4ff,#e8f4ff);border-radius:16px;padding:28px;text-align:center;border:1px solid #e0e8ff;">
            <p style="margin:0 0 16px 0;font-size:12px;font-weight:700;color:#6b7280;letter-spacing:3px;text-transform:uppercase;font-family:${FONT};">Your new verification code</p>
            <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto;">
              <tr>${codeBoxesHtml}</tr>
            </table>
            <p style="margin:16px 0 0 0;font-size:13px;color:#9ca3af;font-family:${FONT};">
              Expires in <strong style="color:#ef4444;">10 minutes</strong>
            </p>
          </td>
        </tr>
      </table>

      <div style="background:#fff7ed;border-radius:12px;padding:20px 24px;margin-bottom:20px;border-left:4px solid #f97316;">
        <p style="margin:0 0 10px 0;font-size:13px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:1px;font-family:${FONT};">Security reminder</p>
        <p style="margin:0 0 6px 0;font-size:13px;color:#78350f;font-family:${FONT};">Never share this code with anyone, including Exodus Logistics staff.</p>
        <p style="margin:0 0 6px 0;font-size:13px;color:#78350f;font-family:${FONT};">This code is single-use and expires in 10 minutes.</p>
        <p style="margin:0;font-size:13px;color:#78350f;font-family:${FONT};">If you did not request this, please secure your account immediately.</p>
      </div>

      <p style="margin:20px 0 0 0;font-size:15px;line-height:24px;color:#6b7280;font-family:${FONT};">
        If you did not request this code, you can safely ignore this email.
      </p>
    `;

    const html = renderEmailTemplate({
      subject: "Your new verification code — Exodus Logistics",
      title: "New verification code",
      preheader: `Hi ${user.name || "there"}, your new verification code is ${verificationCode}`,
      bodyHtml,
      appUrl: APP_URL,
      supportEmail: SUPPORT_EMAIL,
      sentTo: email,
    });

    await resend.emails.send({
      from: RESEND_FROM, to: email,
      subject: "Your new verification code — Exodus Logistics",
      html, replyTo: SUPPORT_EMAIL,
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e?.message || "Server error." }, { status: 500 });
  }
}