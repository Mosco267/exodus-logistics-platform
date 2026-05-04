// src/app/api/user/2fa/verify/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import clientPromise from '@/lib/mongodb';
import { authenticator } from 'otplib';
import { sendApp2FAEnabledEmail } from '@/lib/email';

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { code, purpose } = await req.json();
  // purpose: 'setup' | 'verify'

  if (!code) return NextResponse.json({ error: 'Code is required' }, { status: 400 });

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB);
  const { ObjectId } = require('mongodb');

  const userEmail = session.user.email || '';
  const userId = (session.user as any).id || '';
  const filter = userId
    ? { $or: [{ email: userEmail }, { _id: new ObjectId(userId) }] }
    : { email: userEmail };

  const user = await db.collection('users').findOne(filter);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  if (purpose === 'setup') {
    // Verify against pending secret
    const secret = user.twoFactorPending;
    if (!secret) return NextResponse.json({ error: 'No pending 2FA setup' }, { status: 400 });

    const isValid = authenticator.verify({ token: code.replace(/\s/g, ''), secret });
    if (!isValid) return NextResponse.json({ error: 'Invalid code. Please try again.' }, { status: 400 });

    // Confirm — move pending to active
    await db.collection('users').updateOne(filter, {
      $set: { twoFactorSecret: secret, twoFactorEnabled: true },
      $unset: { twoFactorPending: '' },
    });

    // Send "app 2FA enabled" confirmation email
    try {
      await sendApp2FAEnabledEmail(userEmail, { name: user.name || 'Customer' });
    } catch (e) {
      console.error('Failed to send app 2FA enabled email:', e);
    }

    return NextResponse.json({ ok: true, message: '2FA enabled successfully' });
  }

  if (purpose === 'verify') {
    // Verify against active secret
    const secret = user.twoFactorSecret;
    if (!secret || !user.twoFactorEnabled) {
      // 2FA not enabled — allow through
      return NextResponse.json({ ok: true, bypass: true });
    }

    const isValid = authenticator.verify({ token: code.replace(/\s/g, ''), secret });
    if (!isValid) return NextResponse.json({ error: 'Invalid code. Please try again.' }, { status: 400 });

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Unknown purpose' }, { status: 400 });
}