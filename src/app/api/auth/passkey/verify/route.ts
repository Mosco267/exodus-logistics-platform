// src/app/api/auth/passkey/verify/route.ts
// Verifies passkey authentication and returns a one-time token for NextAuth
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import crypto from 'crypto';

const RP_ID = process.env.NEXT_PUBLIC_DOMAIN || 'localhost';
const ORIGIN = process.env.NEXT_PUBLIC_APP_URL || `https://${RP_ID}`;

export async function POST(req: Request) {
  const { email, credential } = await req.json();
  if (!email || !credential) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB);

  const normalizedEmail = String(email).toLowerCase().trim();

  // Get challenge
  const challengeDoc = await db.collection('passkey_challenges').findOne({ email: normalizedEmail });
  if (!challengeDoc) return NextResponse.json({ error: 'No challenge found. Please try again.' }, { status: 400 });

  // Get user
  const user = await db.collection('users').findOne({ email: normalizedEmail });
  if (!user?.passkeys || user.passkeys.length === 0) {
    return NextResponse.json({ error: 'No passkeys registered' }, { status: 400 });
  }

  const credentialId = credential.id;
  const passkey = user.passkeys.find((pk: any) => pk.id === credentialId);
  if (!passkey) return NextResponse.json({ error: 'Passkey not found' }, { status: 400 });

  try {
    const verification = await verifyAuthenticationResponse({
      response: credential,
      expectedChallenge: challengeDoc.challenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
      authenticator: {
        credentialID: Buffer.from(passkey.id, 'base64url'),
        credentialPublicKey: Buffer.from(passkey.publicKey, 'base64url'),
        counter: passkey.counter,
      },
    });

    if (!verification.verified) return NextResponse.json({ error: 'Verification failed' }, { status: 400 });

    // Update counter
    await db.collection('users').updateOne(
      { email: normalizedEmail, 'passkeys.id': credentialId },
      { $set: { 'passkeys.$.counter': verification.authenticationInfo.newCounter } }
    );

    // Clean up challenge
    await db.collection('passkey_challenges').deleteOne({ email: normalizedEmail });

    // Generate one-time token for NextAuth credentials flow
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 1000); // 1 minute
    await db.collection('passkey_tokens').insertOne({ email: normalizedEmail, token, expires });

    return NextResponse.json({ ok: true, token });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Authentication failed' }, { status: 400 });
  }
}