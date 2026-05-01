// src/app/api/auth/check-passkey/route.ts
// Public endpoint — checks if an email has a passkey registered (no auth required)
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function POST(req: Request) {
  const { email } = await req.json();
  if (!email) return NextResponse.json({ hasPasskey: false });

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB);

  const user = await db.collection('users').findOne(
    { email: String(email).toLowerCase().trim() },
    { projection: { passkeys: 1 } }
  );

  const hasPasskey = !!(user?.passkeys && user.passkeys.length > 0);
  return NextResponse.json({ hasPasskey });
}