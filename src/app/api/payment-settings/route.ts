// src/app/api/payment-settings/route.ts
// Public endpoint used by payment page (no admin auth)

import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

const DEFAULT_SETTINGS = {
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
  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB);
  const doc = await db.collection('payment_settings').findOne({ _id: 'default' as any });
  const settings = doc?.settings || DEFAULT_SETTINGS;
  return NextResponse.json({ settings });
}