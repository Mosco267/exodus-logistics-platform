// ============================================================
// FILE 2: src/app/api/auth/register/route.ts
// ============================================================
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
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
    const body = await req.json();
    const name = String(body.name || "").trim();
    const email = String(body.email || "").toLowerCase().trim();
    const password = String(body.password || "");

    if (!name) return NextResponse.json({ error: "Full name is required." }, { status: 400 });
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: "A valid email address is required." }, { status: 400 });
    if (!password || password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    const blocked = await db.collection("blocked_emails").findOne({ email });
    if (blocked) return NextResponse.json({ error: "This email address is not eligible for registration." }, { status: 403 });

    const existing = await db.collection("users").findOne({ email });
    if (existing) return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });

    const passwordHash = await bcrypt.hash(password, 12);
    const verificationCode = crypto.randomInt(100000, 999999).toString();
    const verificationExpiry = new Date(Date.now() + 10 * 60 * 1000);

    await db.collection("pending_users").deleteMany({ email });
    await db.collection("pending_users").insertOne({
      name, email, passwordHash,
      phone: String(body.phone || "").trim(),
      country: String(body.country || "").trim(),
      role: "USER", provider: "credentials",
      verificationCode, verificationExpiry,
      createdAt: new Date(),
    });

    const codeBoxesHtml = verificationCode.split("").map(digit => `
      <td class="code-cell" style="padding:0 5px;">
        <div class="code-box" style="width:46px;height:56px;background:#f0f4ff;border:2px solid #e0e8ff;border-radius:12px;text-align:center;line-height:56px;font-size:28px;font-weight:900;color:#1d4ed8;font-family:'Courier New',Courier,monospace;">${digit}</div>
      </td>
    `).join("");

    const bodyHtml = `
      <p style="margin:0 0 16px 0;font-size:16px;line-height:26px;color:#111827;font-family:${FONT};">
        Hi <strong style="color:#111827;">${name}</strong>,
      </p>
      <p style="margin:0 0 14px 0;font-size:16px;line-height:26px;color:#111827;font-family:${FONT};">
        Welcome to Exodus Logistics! Thank you for signing up. To complete your
        registration and activate your account, please enter the verification code below.
      </p>
      <p style="margin:0 0 20px 0;font-size:16px;line-height:26px;color:#111827;font-family:${FONT};">
        This code will expire in <strong style="color:#ef4444;">10 minutes</strong>.
      </p>

      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:20px;">
        <tr>
          <td style="background:linear-gradient(135deg,#f0f4ff,#e8f4ff);border-radius:16px;padding:28px;text-align:center;border:1px solid #e0e8ff;">
            <p style="margin:0 0 16px 0;font-size:12px;font-weight:700;color:#6b7280;letter-spacing:3px;text-transform:uppercase;font-family:${FONT};">Your verification code</p>
            <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto;">
              <tr>${codeBoxesHtml}</tr>
            </table>
            <p style="margin:16px 0 0 0;font-size:13px;color:#9ca3af;font-family:${FONT};">
              Expires in <strong style="color:#ef4444;">10 minutes</strong>
            </p>
          </td>
        </tr>
      </table>

      <div style="background:#f8fafc;border-radius:12px;padding:20px 24px;margin-bottom:20px;border-left:4px solid #1d4ed8;">
        <p style="margin:0 0 10px 0;font-size:13px;font-weight:700;color:#111827;text-transform:uppercase;letter-spacing:1px;font-family:${FONT};">What you can do with Exodus Logistics:</p>
        <p style="margin:0 0 6px 0;font-size:13px;color:#6b7280;font-family:${FONT};">&#x2713;&nbsp; Track shipments in real time across 120+ countries</p>
        <p style="margin:0 0 6px 0;font-size:13px;color:#6b7280;font-family:${FONT};">&#x2713;&nbsp; Generate and manage invoices automatically</p>
        <p style="margin:0;font-size:13px;color:#6b7280;font-family:${FONT};">&#x2713;&nbsp; Access our global logistics network instantly</p>
      </div>

      <p style="margin:20px 0 0 0;font-size:15px;line-height:24px;color:#6b7280;font-family:${FONT};">
        If you didn't create this account, you can safely ignore this email. No action is needed.
      </p>
    `;

    const html = renderEmailTemplate({
      subject: "Verify your Exodus Logistics account",
      title: "Welcome to Exodus Logistics!",
      preheader: `Hi ${name}, your verification code is ${verificationCode}`,
      bodyHtml,
      appUrl: APP_URL,
      supportEmail: SUPPORT_EMAIL,
      sentTo: email,
    });

    await resend.emails.send({
      from: RESEND_FROM, to: email,
      subject: "Verify your Exodus Logistics account",
      html, replyTo: SUPPORT_EMAIL,
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e?.message || "Server error." }, { status: 500 });
  }
}