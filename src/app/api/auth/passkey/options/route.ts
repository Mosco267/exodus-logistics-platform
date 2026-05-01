// src/app/api/auth/passkey/options/route.ts
// Gets authentication options for sign-in passkey flow
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { generateAuthenticationOptions } from '@simplewebauthn/server';

const RP_ID = process.env.NEXT_PUBLIC_DOMAIN || 'localhost';

export async function POST(req: Request) {
  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB);

  const user = await db.collection('users').findOne(
    { email: String(email).toLowerCase().trim() },
    { projection: { passkeys: 1 } }
  );

  if (!user?.passkeys || user.passkeys.length === 0) {
    return NextResponse.json({ error: 'No passkeys registered for this account' }, { status: 400 });
  }

  const options = await generateAuthenticationOptions({
    rpID: RP_ID,
    allowCredentials: user.passkeys.map((pk: any) => ({
      id: Buffer.from(pk.id, 'base64url'),
      type: 'public-key',
    })),
    userVerification: 'preferred',
  });

  // Store challenge against email temporarily
  await db.collection('passkey_challenges').updateOne(
    { email: String(email).toLowerCase().trim() },
    { $set: { challenge: options.challenge, createdAt: new Date() } },
    { upsert: true }
  );

  return NextResponse.json(options);
}