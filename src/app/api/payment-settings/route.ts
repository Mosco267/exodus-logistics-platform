import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { auth } from '@/auth';
import { DEFAULT_PAYMENT_SETTINGS, PaymentSettings } from '@/lib/payment-settings';

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB);

  const doc = await db.collection('payment_settings').findOne({ _id: 'main' as any });
  const stored = (doc?.settings as PaymentSettings) || DEFAULT_PAYMENT_SETTINGS;

  // Filter out disabled methods and only return what users need
  const publicSettings = {
    card: stored.card || DEFAULT_PAYMENT_SETTINGS.card,
    bitcoin: stored.bitcoin || DEFAULT_PAYMENT_SETTINGS.bitcoin,
    usdt: stored.usdt || DEFAULT_PAYMENT_SETTINGS.usdt,
    ethereum: stored.ethereum || DEFAULT_PAYMENT_SETTINGS.ethereum,
    bankTransfer: stored.bankTransfer || DEFAULT_PAYMENT_SETTINGS.bankTransfer,
    paypal: stored.paypal || DEFAULT_PAYMENT_SETTINGS.paypal,
    customMethods: (stored.customMethods || []).filter(m => m.enabled),
  };

  return NextResponse.json({ settings: publicSettings });
}