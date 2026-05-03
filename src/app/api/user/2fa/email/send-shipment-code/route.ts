// src/app/api/user/2fa/email/send-shipment-code/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { Resend } from 'resend';
import { renderEmailTemplate } from '@/lib/emailTemplate';

const resend = new Resend(process.env.RESEND_API_KEY);
const APP_URL = (process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "https://www.goexoduslogistics.com").replace(/\/$/, "");
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || "support@goexoduslogistics.com";
const RESEND_FROM = process.env.RESEND_FROM || `Exodus Logistics <${SUPPORT_EMAIL}>`;
const FONT = `-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif`;

export async function POST() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expires = new Date(Date.now() + 10 * 60 * 1000);

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB);
  const userEmail = session.user.email || '';
  const userId = (session.user as any).id || '';
  const filter = userId ? { $or: [{ email: userEmail }, { _id: new ObjectId(userId) }] } : { email: userEmail };

  await db.collection('users').updateOne(filter, {
    $set: { shipmentVerifyCode: code, shipmentVerifyCodeExpires: expires },
  });

  const user = await db.collection('users').findOne(filter);
  const name = user?.name || 'Customer';

  const codeBoxesHtml = code.split("").map(digit => `
    <td style="padding:0 5px;">
      <div style="width:46px;height:56px;background:#f0f4ff;border:2px solid #e0e8ff;border-radius:12px;text-align:center;line-height:56px;font-size:28px;font-weight:900;color:#1d4ed8;font-family:'Courier New',Courier,monospace;">${digit}</div>
    </td>
  `).join("");

  const bodyHtml = `
    <p style="margin:0 0 16px 0;font-size:16px;line-height:26px;color:#111827;font-family:${FONT};">
      Hi <strong style="color:#111827;">${name}</strong>,
    </p>
    <p style="margin:0 0 14px 0;font-size:16px;line-height:26px;color:#111827;font-family:${FONT};">
      You're attempting to create a new shipment on your Exodus Logistics account.
      To verify your identity and complete this action, please enter the verification code below.
    </p>
    <p style="margin:0 0 20px 0;font-size:16px;line-height:26px;color:#111827;font-family:${FONT};">
      This code will expire in <strong style="color:#ef4444;">10 minutes</strong>.
    </p>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:20px;">
      <tr>
        <td style="background:linear-gradient(135deg,#f0f4ff,#e8f4ff);border-radius:16px;padding:28px;text-align:center;border:1px solid #e0e8ff;">
          <p style="margin:0 0 16px 0;font-size:12px;font-weight:700;color:#6b7280;letter-spacing:3px;text-transform:uppercase;font-family:${FONT};">Verification code</p>
          <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto;">
            <tr>${codeBoxesHtml}</tr>
          </table>
          <p style="margin:16px 0 0 0;font-size:13px;color:#9ca3af;font-family:${FONT};">
            Expires in <strong style="color:#ef4444;">10 minutes</strong>
          </p>
        </td>
      </tr>
    </table>

    <div style="background:#fef3c7;border-radius:12px;padding:20px 24px;margin-bottom:20px;border-left:4px solid #f59e0b;">
      <p style="margin:0 0 6px 0;font-size:13px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:1px;font-family:${FONT};">Did you request this?</p>
      <p style="margin:0;font-size:13px;color:#78350f;line-height:20px;font-family:${FONT};">
        If you did not attempt to create a shipment, please ignore this email and consider changing your password as a precaution.
      </p>
    </div>

    <p style="margin:20px 0 0 0;font-size:15px;line-height:24px;color:#6b7280;font-family:${FONT};">
      For your security, never share this code with anyone. Exodus Logistics will never ask for your verification code.
    </p>
  `;

  const html = renderEmailTemplate({
    subject: "Verify your shipment creation",
    title: "Verify your identity",
    preheader: `Hi ${name}, your shipment verification code is ${code}`,
    bodyHtml,
    appUrl: APP_URL,
    supportEmail: SUPPORT_EMAIL,
    sentTo: userEmail,
  });

  await resend.emails.send({
    from: RESEND_FROM,
    to: userEmail,
    subject: 'Verify your shipment creation',
    html,
    replyTo: SUPPORT_EMAIL,
  });

  return NextResponse.json({ ok: true });
}