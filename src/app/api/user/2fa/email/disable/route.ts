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

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { code } = await req.json();
  if (!code) return NextResponse.json({ error: 'Verification code is required' }, { status: 400 });

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB);
  const userEmail = session.user.email || '';
  const userId = (session.user as any).id || '';
  const filter = userId ? { $or: [{ email: userEmail }, { _id: new ObjectId(userId) }] } : { email: userEmail };

  const user = await db.collection('users').findOne(filter);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const storedCode = (user as any).twoFactorEmailDisableCode;
  const expires = (user as any).twoFactorEmailDisableCodeExpires;

  if (!storedCode || !expires) {
    return NextResponse.json({ error: 'No disable code requested. Please try again.' }, { status: 400 });
  }
  if (new Date(expires) < new Date()) {
    return NextResponse.json({ error: 'Code has expired. Please request a new one.' }, { status: 400 });
  }
  if (String(code).trim() !== String(storedCode)) {
    return NextResponse.json({ error: 'Invalid verification code' }, { status: 400 });
  }

  const name = user.name || 'Customer';

  await db.collection('users').updateOne(filter, {
    $unset: {
      twoFactorEmailEnabled: '',
      twoFactorEmailCode: '',
      twoFactorEmailCodeExpires: '',
      twoFactorEmailDisableCode: '',
      twoFactorEmailDisableCodeExpires: '',
    },
  });

  // Send confirmation email
  const bodyHtml = `
    <p style="margin:0 0 16px 0;font-size:16px;line-height:26px;color:#111827;font-family:${FONT};">
      Hi <strong style="color:#111827;">${name}</strong>,
    </p>
    <p style="margin:0 0 14px 0;font-size:16px;line-height:26px;color:#111827;font-family:${FONT};">
      This email confirms that <strong>email-based two-factor authentication</strong> has been disabled on your Exodus Logistics account.
    </p>
    <p style="margin:0 0 20px 0;font-size:16px;line-height:26px;color:#111827;font-family:${FONT};">
      You will no longer be required to enter an email verification code for sensitive actions like creating shipments.
    </p>

    <div style="background:#fef3c7;border-radius:12px;padding:20px 24px;margin-bottom:20px;border-left:4px solid #f59e0b;">
      <p style="margin:0 0 6px 0;font-size:13px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:1px;font-family:${FONT};">Didn't do this?</p>
      <p style="margin:0;font-size:13px;color:#78350f;line-height:20px;font-family:${FONT};">
        If you did not disable email 2FA, your account may be at risk. Please change your password immediately and contact support.
      </p>
    </div>

    <div style="background:#f8fafc;border-radius:12px;padding:20px 24px;margin-bottom:20px;border-left:4px solid #1d4ed8;">
      <p style="margin:0 0 10px 0;font-size:13px;font-weight:700;color:#111827;text-transform:uppercase;letter-spacing:1px;font-family:${FONT};">For your security:</p>
      <p style="margin:0 0 6px 0;font-size:13px;color:#6b7280;font-family:${FONT};">&#x2713;&nbsp; Consider enabling authenticator app 2FA instead</p>
      <p style="margin:0 0 6px 0;font-size:13px;color:#6b7280;font-family:${FONT};">&#x2713;&nbsp; Use a strong, unique password</p>
      <p style="margin:0;font-size:13px;color:#6b7280;font-family:${FONT};">&#x2713;&nbsp; Review your recent account activity regularly</p>
    </div>

    <p style="margin:20px 0 0 0;font-size:15px;line-height:24px;color:#6b7280;font-family:${FONT};">
      You can re-enable email 2FA at any time from your account security settings.
    </p>
  `;

  const html = renderEmailTemplate({
    subject: "Email 2FA disabled on your account",
    title: "Email 2FA disabled",
    preheader: `Hi ${name}, email two-factor authentication has been disabled on your account.`,
    bodyHtml,
    appUrl: APP_URL,
    supportEmail: SUPPORT_EMAIL,
    sentTo: userEmail,
  });

  try {
    await resend.emails.send({
      from: RESEND_FROM,
      to: userEmail,
      subject: 'Email 2FA disabled on your account',
      html,
      replyTo: SUPPORT_EMAIL,
    });
  } catch {}

  return NextResponse.json({ ok: true });
}