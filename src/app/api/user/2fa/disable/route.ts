// src/app/api/user/2fa/disable/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import clientPromise from '@/lib/mongodb';
import { authenticator } from 'otplib';

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { code } = await req.json();
  if (!code) return NextResponse.json({ error: 'Verification code required' }, { status: 400 });

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB);
  const { ObjectId } = require('mongodb');

  const userEmail = session.user.email || '';
  const userId = (session.user as any).id || '';
  const filter = userId
    ? { $or: [{ email: userEmail }, { _id: new ObjectId(userId) }] }
    : { email: userEmail };

  const user = await db.collection('users').findOne(filter);
  if (!user?.twoFactorSecret) return NextResponse.json({ error: '2FA not enabled' }, { status: 400 });

  const isValid = authenticator.verify({ token: code.replace(/\s/g, ''), secret: user.twoFactorSecret });
  if (!isValid) return NextResponse.json({ error: 'Invalid code' }, { status: 400 });

  await db.collection('users').updateOne(filter, {
    $unset: { twoFactorSecret: '', twoFactorEnabled: '', twoFactorPending: '' },
  });

  return NextResponse.json({ ok: true });
}