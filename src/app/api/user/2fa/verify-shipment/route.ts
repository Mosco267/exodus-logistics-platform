// src/app/api/user/2fa/verify-shipment/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { authenticator } from 'otplib';

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { code, method } = await req.json(); // method: 'email' | 'app'
  if (!code) return NextResponse.json({ error: 'Code is required' }, { status: 400 });

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB);

  const userEmail = session.user.email || '';
  const userId = (session.user as any).id || '';
  const filter = userId
    ? { $or: [{ email: userEmail }, { _id: new ObjectId(userId) }] }
    : { email: userEmail };

  const user = await db.collection('users').findOne(filter);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const cleanCode = code.replace(/\s/g, '');

  if (method === 'email') {
    if (!user.shipmentVerifyCode || !user.shipmentVerifyCodeExpires) {
      return NextResponse.json({ error: 'No code was sent. Please request a new one.' }, { status: 400 });
    }
    if (new Date() > new Date(user.shipmentVerifyCodeExpires)) {
      return NextResponse.json({ error: 'Code has expired. Please request a new one.' }, { status: 400 });
    }
    if (user.shipmentVerifyCode !== cleanCode) {
      return NextResponse.json({ error: 'Invalid code. Please try again.' }, { status: 400 });
    }
    // Clear after use
    await db.collection('users').updateOne(filter, {
      $unset: { shipmentVerifyCode: '', shipmentVerifyCodeExpires: '' },
    });
    return NextResponse.json({ ok: true });
  }

  if (method === 'app') {
    const secret = user.twoFactorSecret;
    if (!secret || !user.twoFactorEnabled) {
      return NextResponse.json({ error: 'Authenticator app is not enabled' }, { status: 400 });
    }
    const isValid = authenticator.verify({ token: cleanCode, secret });
    if (!isValid) return NextResponse.json({ error: 'Invalid code. Please try again.' }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Unknown method' }, { status: 400 });
}