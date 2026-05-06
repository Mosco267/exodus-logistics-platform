import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { auth } from '@/auth';
import { DEFAULT_PAYMENT_SETTINGS, PaymentSettings } from '@/lib/payment-settings';

export async function GET() {
  const session = await auth();
  if ((session?.user as any)?.role !== 'ADMIN')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB);

  const doc = await db.collection('payment_settings').findOne({ _id: 'main' as any });
  const stored = (doc?.settings as PaymentSettings) || {};

  // Merge with defaults
  const settings: PaymentSettings = {
    ...DEFAULT_PAYMENT_SETTINGS,
    ...stored,
    card: { ...DEFAULT_PAYMENT_SETTINGS.card, ...(stored.card || {}) },
    bitcoin: { ...DEFAULT_PAYMENT_SETTINGS.bitcoin, ...(stored.bitcoin || {}) },
    usdt: { ...DEFAULT_PAYMENT_SETTINGS.usdt, ...(stored.usdt || {}) },
    ethereum: { ...DEFAULT_PAYMENT_SETTINGS.ethereum, ...(stored.ethereum || {}) },
    bankTransfer: { ...DEFAULT_PAYMENT_SETTINGS.bankTransfer, ...(stored.bankTransfer || {}) },
    paypal: { ...DEFAULT_PAYMENT_SETTINGS.paypal, ...(stored.paypal || {}) },
    customMethods: stored.customMethods || [],
  };

  return NextResponse.json({ settings });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if ((session?.user as any)?.role !== 'ADMIN')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { settings } = await req.json();
  if (!settings) return NextResponse.json({ error: 'Missing settings' }, { status: 400 });

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB);

  await db.collection('payment_settings').updateOne(
    { _id: 'main' as any },
    {
      $set: {
        settings,
        updatedAt: new Date(),
        updatedBy: (session?.user as any)?.email || 'admin',
      },
    },
    { upsert: true }
  );

  return NextResponse.json({ ok: true });
}