// src/app/api/user/2fa/email/verify/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { sendEmail2FAEnabledEmail } from '@/lib/email';

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { code } = await req.json();
  if (!code) return NextResponse.json({ error: 'Code required' }, { status: 400 });

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB);
  const userEmail = session.user.email || '';
  const userId = (session.user as any).id || '';
  const filter = userId ? { $or: [{ email: userEmail }, { _id: new ObjectId(userId) }] } : { email: userEmail };

  const user = await db.collection('users').findOne(filter);
  if (!user?.twoFactorEmailCode) return NextResponse.json({ error: 'No code found' }, { status: 400 });
  if (new Date() > new Date(user.twoFactorEmailCodeExpires)) return NextResponse.json({ error: 'Code expired' }, { status: 400 });
  if (user.twoFactorEmailCode !== code.replace(/\D/g, '')) return NextResponse.json({ error: 'Invalid code' }, { status: 400 });

  await db.collection('users').updateOne(filter, {
    $set: { twoFactorEmailEnabled: true },
    $unset: { twoFactorEmailCode: '', twoFactorEmailCodeExpires: '' },
  });

  // Send "email 2FA enabled" confirmation email
  try {
    await sendEmail2FAEnabledEmail(userEmail, { name: user.name || 'Customer' });
  } catch (e) {
    console.error('Failed to send email 2FA enabled email:', e);
  }

  return NextResponse.json({ ok: true });
}