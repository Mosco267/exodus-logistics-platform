// src/app/api/admin/payment-settings/route.ts

import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { auth } from "@/auth";

export type CryptoWallet = {
  enabled: boolean;
  address: string;
  qrImageUrl: string;
  network?: string;
};

export type PaymentSettings = {
  crypto: {
    bitcoin: CryptoWallet;
    ethereum: CryptoWallet;
    usdt: CryptoWallet;
  };
  zelle: { enabled: boolean; phone: string; email: string; holderName: string };
  bankTransfer: {
    enabled: boolean;
    bankName: string;
    accountName: string;
    accountNumber: string;
    routingNumber: string;
    swiftCode: string;
    iban: string;
    instructions: string;
  };
  paypal: { enabled: boolean; email: string; link: string; useLink: boolean };
  cashApp: { enabled: boolean; cashtag: string; qrImageUrl: string };
  others: { enabled: boolean; instructions: string };
};

const DEFAULT_SETTINGS: PaymentSettings = {
  crypto: {
    bitcoin: { enabled: false, address: '', qrImageUrl: '', network: 'Bitcoin (BTC)' },
    ethereum: { enabled: false, address: '', qrImageUrl: '', network: 'Ethereum (ERC-20)' },
    usdt: { enabled: false, address: '', qrImageUrl: '', network: 'USDT (TRC-20 / ERC-20)' },
  },
  zelle: { enabled: false, phone: '', email: '', holderName: '' },
  bankTransfer: {
    enabled: false, bankName: '', accountName: '', accountNumber: '',
    routingNumber: '', swiftCode: '', iban: '', instructions: '',
  },
  paypal: { enabled: false, email: '', link: '', useLink: false },
  cashApp: { enabled: false, cashtag: '', qrImageUrl: '' },
  others: { enabled: true, instructions: '' },
};

export async function GET() {
  const session = await auth();
  const role = String((session as any)?.user?.role || '').toUpperCase();
  if (role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB);
  const doc = await db.collection('payment_settings').findOne({ _id: 'default' as any });
  const settings = doc?.settings || DEFAULT_SETTINGS;
  return NextResponse.json({ settings });
}

export async function PATCH(req: Request) {
  const session = await auth();
  const role = String((session as any)?.user?.role || '').toUpperCase();
  if (role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { settings } = await req.json();
  if (!settings) return NextResponse.json({ error: 'Missing settings' }, { status: 400 });

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB);
  await db.collection('payment_settings').updateOne(
    { _id: 'default' as any },
    { $set: { settings, updatedAt: new Date() } },
    { upsert: true }
  );
  return NextResponse.json({ ok: true });
}

// Public GET for payment page (no admin auth needed)
export async function POST() {
  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB);
  const doc = await db.collection('payment_settings').findOne({ _id: 'default' as any });
  const settings = doc?.settings || DEFAULT_SETTINGS;
  return NextResponse.json({ settings });
}