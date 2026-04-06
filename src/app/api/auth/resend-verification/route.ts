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
        <body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 20px;">
            <tr><td align="center">
              <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
                <tr><td style="background:linear-gradient(135deg,#1d4ed8 0%,#0891b2 100%);padding:36px 40px;text-align:center;">
                  <img src="https://goexoduslogistics.com/logo-dark.svg" alt="Exodus Logistics" style="height:44px;width:auto;" />
                </td></tr>
                <tr><td style="padding:40px;">
                  <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#111827;">New verification code</h1>
                  <p style="margin:0 0 28px;font-size:15px;color:#6b7280;">Here is your new 6-digit code:</p>
                  <div style="background:#f0f4ff;border-radius:16px;padding:28px;text-align:center;margin-bottom:28px;">
                    <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#6b7280;letter-spacing:2px;text-transform:uppercase;">Verification code</p>
                    <p style="margin:0;font-size:48px;font-weight:900;letter-spacing:12px;color:#1d4ed8;">${verificationCode}</p>
                  </div>
                  <p style="margin:0;font-size:13px;color:#9ca3af;text-align:center;">Expires in <strong>10 minutes</strong>.</p>
                </td></tr>
                <tr><td style="background:#f8fafc;padding:24px 40px;text-align:center;border-top:1px solid #f1f5f9;">
                  <p style="margin:0;font-size:12px;color:#9ca3af;">© ${new Date().getFullYear()} Exodus Logistics Ltd. All rights reserved.</p>
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