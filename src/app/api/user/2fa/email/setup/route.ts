// src/app/api/user/2fa/email/setup/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM || 'support@goexoduslogistics.com';

export async function POST() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 min

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB);
  const userEmail = session.user.email || '';
  const userId = (session.user as any).id || '';
  const filter = userId ? { $or: [{ email: userEmail }, { _id: new ObjectId(userId) }] } : { email: userEmail };

  await db.collection('users').updateOne(filter, {
    $set: { twoFactorEmailCode: code, twoFactorEmailCodeExpires: expires },
  });

  await resend.emails.send({
    from: FROM,
    to: userEmail,
    subject: 'Your Exodus Logistics 2FA Setup Code',
    html: `<p>Your 2FA activation code is: <strong style="font-size:24px;letter-spacing:4px">${code}</strong></p><p>This code expires in 10 minutes.</p>`,
  });

  return NextResponse.json({ ok: true });
}