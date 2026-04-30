// src/app/api/user/2fa/setup/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import clientPromise from '@/lib/mongodb';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';

export async function POST() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB);

  const userEmail = session.user.email || '';
  const userId = (session.user as any).id || '';

  // Generate new secret
  const secret = authenticator.generateSecret();
  const appName = 'Exodus Logistics';
  const otpAuthUrl = authenticator.keyuri(userEmail, appName, secret);

  // Generate QR code as data URL
  const qrCodeDataUrl = await QRCode.toDataURL(otpAuthUrl, {
    width: 200,
    margin: 2,
    color: { dark: '#0b3aa4', light: '#ffffff' },
  });

  // Save pending secret (not yet confirmed)
  const { ObjectId } = require('mongodb');
  const filter = userId
    ? { $or: [{ email: userEmail }, { _id: new ObjectId(userId) }] }
    : { email: userEmail };

  await db.collection('users').updateOne(filter, {
    $set: { twoFactorPending: secret, twoFactorEnabled: false },
  });

  return NextResponse.json({
    secret,
    qrCodeDataUrl,
    manualEntryKey: secret,
    otpAuthUrl,
  });
}